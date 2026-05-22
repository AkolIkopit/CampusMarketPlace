import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from './UserManagement';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

const sampleUsers = [
  {
    id: 'user-1',
    full_name: 'Alice Admin',
    role: 'admin',
    campus: 'Main Campus',
    is_suspended: false
  },
  {
    id: 'user-2',
    full_name: 'Bob Student',
    role: 'student',
    campus: 'Education Campus',
    is_suspended: true
  }
];

function createUserManagementMocks({ users = sampleUsers, updateError = null } = {}) {
  let currentUsers = [...users];

  const orderFn = jest.fn().mockImplementation(() =>
    Promise.resolve({ data: currentUsers, error: null })
  );

  const eq = jest.fn((column, value) => {
    if (column === 'is_suspended') {
      const filtered = currentUsers.filter((user) => Boolean(user.is_suspended) === value);
      return {
        count: filtered.length,
        order: jest.fn().mockResolvedValue({ data: filtered, error: null })
      };
    }
    return { order: orderFn };
  });
  const select = jest.fn(() => ({ eq }));

  const updateEq = jest.fn().mockImplementation(async () => {
    return { error: updateError };
  });
  const update = jest.fn(() => ({ eq: updateEq }));

  const deleteEq = jest.fn().mockResolvedValue({ error: null });
  const remove = jest.fn(() => ({ eq: deleteEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'profiles') {
      return { select, update, delete: remove };
    }
    if (table === 'moderation_logs') {
      return { insert: jest.fn().mockResolvedValue({ error: null }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });

  return { updateEq, deleteEq };
}

describe('UserManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const clickActionButton = async (label) => {
    const button = screen
      .getAllByRole('button')
      .find((candidate) => candidate.textContent.replace(/\s+/g, ' ').trim() === label);
    await userEvent.click(button);
  };

  it('renders all fetched users with their details', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows Active/Suspended status correctly', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows Suspend for active users and Reactivate for banned users', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Suspended/ }));
    expect(await screen.findByRole('button', { name: /Reactivate/ })).toBeInTheDocument();
  });

  it('suspends an active user', async () => {
    const { updateEq } = createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    await clickActionButton('Suspend');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Policy');
    await userEvent.type(screen.getByPlaceholderText('Provide context for admin logs...'), 'Repeated policy violations');
    await userEvent.click(screen.getByRole('button', { name: /Confirm suspend/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, Proceed' }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  it('reactivates a banned user', async () => {
    const { updateEq } = createUserManagementMocks();

    render(<UserManagement />);

    await userEvent.click(await screen.findByRole('button', { name: /Suspended/ }));
    await screen.findByText('Bob Student');

    await userEvent.click(screen.getByRole('button', { name: /Reactivate/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, Proceed' }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'user-2');
    });
  });

  it('deletes a user after confirmation', async () => {
    const { deleteEq } = createUserManagementMocks();

    window.confirm.mockReturnValue(true);

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/ });
    await userEvent.click(deleteButtons[0]);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Fraud');
    await userEvent.type(screen.getByPlaceholderText('Provide context for admin logs...'), 'Fraudulent account');
    await userEvent.click(screen.getByRole('button', { name: /Confirm delete/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, Proceed' }));

    await waitFor(() => {
      expect(deleteEq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  it('does not delete a user when confirmation is cancelled', async () => {
    const { deleteEq } = createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/ });
    await userEvent.click(deleteButtons[0]);

    expect(deleteEq).not.toHaveBeenCalled();
  });

  it('filters users by name search term', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const searchInput = screen.getByPlaceholderText('Search students...');
    await userEvent.type(searchInput, 'Bob');

    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    expect(screen.getByText('NO USERS FOUND')).toBeInTheDocument();
  });

  it('filters users by role search term', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const searchInput = screen.getByPlaceholderText('Search students...');
    await userEvent.type(searchInput, 'Alice');

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
  });

  it('shows no users found when search matches nothing', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const searchInput = screen.getByPlaceholderText('Search students...');
    await userEvent.type(searchInput, 'zzznomatch');

    expect(screen.getByText('NO USERS FOUND')).toBeInTheDocument();
  });
});