import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TradeStaffDashboard from './TradeStaffDashboard';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn()
    }
  }
}));

describe('TradeStaffDashboard', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
  });

  it('renders the UniMart logo text', () => {
    render(<TradeStaffDashboard />);

    expect(screen.getByText('UniMart')).toBeInTheDocument();
  });

  it('renders the hero heading for trade staff', () => {
    render(<TradeStaffDashboard />);

    expect(screen.getByText('Manage marketplace sales or trades and exchanges.')).toBeInTheDocument();
  });

  it('renders the TRADE FACILITY STAFF kicker', () => {
    render(<TradeStaffDashboard />);

    expect(screen.getByText('TRADE FACILITY STAFF')).toBeInTheDocument();
  });

  it('renders the current action blocks', () => {
    render(<TradeStaffDashboard />);

    expect(screen.getByText('Market')).toBeInTheDocument();
    expect(screen.getByText('My Assigned Trades & Sales')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });

  it('navigates to /dashboard/staff/market on Market click', async () => {
    render(<TradeStaffDashboard />);

    await userEvent.click(screen.getByText('Market').closest('button'));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/staff/market');
  });

  it('navigates to /dashboard/staff/my-trades on My Trades click', async () => {
    render(<TradeStaffDashboard />);

    await userEvent.click(screen.getByText('My Assigned Trades & Sales').closest('button'));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/staff/my-trades');
  });

  it('opens the burger menu when ☰ is clicked', async () => {
    render(<TradeStaffDashboard />);

    await userEvent.click(screen.getByRole('button', { name: '☰' }));

    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('closes the burger menu when ☰ is clicked again', async () => {
    render(<TradeStaffDashboard />);

    await userEvent.click(screen.getByRole('button', { name: '☰' }));
    expect(screen.getByText('Logout')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '☰' }));
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('signs out and navigates to / on Logout click', async () => {
    supabase.auth.signOut.mockResolvedValue({});

    render(<TradeStaffDashboard />);

    await userEvent.click(screen.getByRole('button', { name: '☰' }));
    await userEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });

  it('opens the edit profile view when Edit Profile is clicked', async () => {
    render(<TradeStaffDashboard profile={{ id: 'staff-1', full_name: 'Staff User', phone_number: '0123456789', student_number: '12345', campus: 'Main Campus', bio: 'Staff bio', avatar_url: '/avatar.png' }} />);

    await userEvent.click(screen.getByRole('button', { name: '☰' }));
    await userEvent.click(screen.getByText('My Profile').closest('button'));

    expect(await screen.findByText('Save Changes')).toBeInTheDocument();
  });
});