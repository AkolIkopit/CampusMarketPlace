import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn()
    },
    from: jest.fn(),
    channel: jest.fn()
  }
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    supabase.auth.signOut.mockResolvedValue({});
    supabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null })
      }))
    });
    supabase.channel.mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn()
    });
  });

  it('toggles the burger menu', async () => {
    render(<AdminDashboard />);

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '☰' }));

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});
