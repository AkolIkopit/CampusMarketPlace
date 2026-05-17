import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from './UserManagement';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const sampleUsers = [
  {
    id: 'user-1',
    full_name: 'Alice Admin',
    role: 'admin',
    campus: 'Main Campus',
    is_banned: false
  },
  {
    id: 'user-2',
    full_name: 'Bob Student',
    role: 'student',
    campus: 'Education Campus',
    is_banned: true
  }
];

function createUserManagementMocks({ users = sampleUsers, updateError = null } = {}) {
  let currentUsers = [...users];

  const orderFn = jest.fn().mockImplementation(() =>
    Promise.resolve({ data: currentUsers, error: null })
  );

  const select = jest.fn(() => ({ order: orderFn }));

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
    throw new Error(`Unexpected table: ${table}`);
  });

  return { updateEq, deleteEq };
}

describe('UserManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all fetched users with their details', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Student')).toBeInTheDocument();
    expect(screen.getByText('student')).toBeInTheDocument();
  });

  it('shows Active/Suspended status correctly', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('shows Suspend for active users and Reactivate for banned users', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
  });

  it('suspends an active user', async () => {
    const { updateEq } = createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    await userEvent.click(screen.getByRole('button', { name: 'Suspend' }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  it('reactivates a banned user', async () => {
    const { updateEq } = createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Bob Student');

    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'user-2');
    });
  });

  it('deletes a user after confirmation', async () => {
    const { deleteEq } = createUserManagementMocks();

    window.confirm.mockReturnValue(true);

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteEq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  it('does not delete a user when confirmation is cancelled', async () => {
    const { deleteEq } = createUserManagementMocks();

    window.confirm.mockReturnValue(false);

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await userEvent.click(deleteButtons[0]);

    expect(deleteEq).not.toHaveBeenCalled();
  });

  it('filters users by name search term', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const searchInput = screen.getByPlaceholderText('Search users by name or role...');
    await userEvent.type(searchInput, 'Bob');

    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Student')).toBeInTheDocument();
  });

  it('filters users by role search term', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const searchInput = screen.getByPlaceholderText('Search users by name or role...');
    await userEvent.type(searchInput, 'admin');

    expect(screen.queryByText('Bob Student')).not.toBeInTheDocument();
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
  });

  it('shows no users found when search matches nothing', async () => {
    createUserManagementMocks();

    render(<UserManagement />);

    await screen.findByText('Alice Admin');

    const searchInput = screen.getByPlaceholderText('Search users by name or role...');
    await userEvent.type(searchInput, 'zzznomatch');

    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });
});
