import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleApproval from './RoleApproval';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const sampleApplications = [
  {
    id: 'app-1',
    user_id: 'user-1',
    full_name: 'Jane Doe',
    requested_role: 'staff',
    campus_location: 'Main Campus',
    motivation: 'I want to help students.',
    experience: '2 years volunteering',
    availability: {
      Monday: { available: true, start: '08:00', end: '12:00' },
      Tuesday: { available: false, start: '08:00', end: '12:00' }
    }
  },
  {
    id: 'app-2',
    user_id: 'user-2',
    full_name: 'John Smith',
    requested_role: 'admin',
    campus_location: 'Education Campus',
    motivation: 'Passionate about operations.',
    experience: '1 year in admin roles',
    availability: 'Weekends'
  }
];

function createRoleApprovalMocks({ applications = sampleApplications, updateError = null } = {}) {
  let currentApplications = [...applications];

  const orderFn = jest.fn().mockImplementation(() =>
    Promise.resolve({ data: currentApplications, error: null })
  );

  const eqForStatus = jest.fn(() => ({ order: orderFn }));
  const select = jest.fn(() => ({ eq: eqForStatus }));

  const updateEq = jest.fn().mockImplementation(async () => {
    // Simulate removal from pending list after update
    currentApplications = [];
    return { error: updateError };
  });

  const update = jest.fn(() => ({ eq: updateEq }));
  const insert = jest.fn().mockResolvedValue({ error: null });

  supabase.from.mockImplementation((table) => {
    if (table === 'role_applications') {
      return { select, update };
    }
    if (table === 'profiles') {
      return { update };
    }
    if (table === 'staff_roster') {
      return { insert };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { updateEq, update };
}

describe('RoleApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pending applications with applicant details', async () => {
    createRoleApprovalMocks();

    render(<RoleApproval />);

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('STAFF')).toBeInTheDocument();
    expect(screen.getByText('Main Campus')).toBeInTheDocument();
    expect(screen.getByText('I want to help students.')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('shows no pending applications message when the list is empty', async () => {
    createRoleApprovalMocks({ applications: [] });

    render(<RoleApproval />);

    expect(await screen.findByText('No pending applications.')).toBeInTheDocument();
  });

  it('approves an application and refreshes the list', async () => {
    const { updateEq } = createRoleApprovalMocks();

    render(<RoleApproval />);

    await screen.findByText('Jane Doe');

    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    await userEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'app-1');
    });

    expect(window.alert).toHaveBeenCalledWith(
      'Staff member approved and schedule synchronized to roster!'
    );
  });

  it('rejects an application and refreshes the list', async () => {
    const { updateEq } = createRoleApprovalMocks();

    render(<RoleApproval />);

    await screen.findByText('Jane Doe');

    const rejectButtons = screen.getAllByRole('button', { name: 'Reject' });
    await userEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'app-1');
    });
  });

  it('disables buttons while an action is in progress', async () => {
    // Make update hang so we can observe the loading state
    const orderFn = jest.fn().mockResolvedValue({ data: sampleApplications, error: null });
    const eqForStatus = jest.fn(() => ({ order: orderFn }));
    const select = jest.fn(() => ({ eq: eqForStatus }));

    let resolveUpdate;
    const updateEq = jest.fn(
      () => new Promise((resolve) => { resolveUpdate = resolve; })
    );
    const update = jest.fn(() => ({ eq: updateEq }));

    supabase.from.mockImplementation(() => ({ select, update }));

    render(<RoleApproval />);

    await screen.findByText('Jane Doe');

    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    userEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Approve' })[0]).toBeDisabled();
    });

    resolveUpdate({ error: null });
  });
});
