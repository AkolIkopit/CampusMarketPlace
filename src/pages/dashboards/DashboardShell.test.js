import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardShell from './DashboardShell';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn()
    }
  }
}));

describe('DashboardShell', () => {
  let navigateMock;

  const props = {
    theme: 'student',
    profile: { full_name: 'Jane Student', role: 'staff' },
    title: 'Workspace',
    subtitle: 'Quick links',
    cards: [
      { title: 'Listings', description: 'Manage your listings', icon: <span>1</span> },
      { title: 'Messages', description: 'Reply faster', icon: <span>2</span> }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
    document.body.style.overflow = '';
  });

  it('renders the user summary and card content', () => {
    render(<DashboardShell {...props} />);

    expect(screen.getAllByText('Jane Student')).toHaveLength(2);
    expect(screen.getAllByText('Trade Facility Staff')).toHaveLength(2);
    expect(screen.getByText('Manage your listings')).toBeInTheDocument();
  });

  it('opens the mobile menu and closes it on desktop resize', async () => {
    render(<DashboardShell {...props} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open dashboard menu' }));

    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Close dashboard menu' })).toBeInTheDocument();

    window.innerWidth = 1024;
    fireEvent(window, new Event('resize'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open dashboard menu' })).toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('');
  });

  it('signs out and routes back to the landing page', async () => {
    supabase.auth.signOut.mockResolvedValue({});

    render(<DashboardShell {...props} />);

    await userEvent.click(screen.getAllByRole('button', { name: 'Logout' })[0]);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
