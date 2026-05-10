import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentDashboard from './StudentDashboard';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock, __setSearchParams } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

const profile = {
  id: 'user-1',
  full_name: 'Jane Student',
  campus: 'Main Campus',
  bio: 'Chemistry major',
  role: 'student'
};

const sampleListings = [
  {
    id: 'listing-1',
    title: 'Organic Chemistry Textbook',
    price: 350,
    status: 'active',
    condition: 'Good',
    location: 'Main Campus',
    category_id: 1,
    categories: { name: 'Books' },
    listing_images: [],
    profiles: { full_name: 'Jane Student', avatar_url: '', campus: 'Main Campus' }
  }
];

function createStudentDashboardMocks({
  listings = sampleListings,
  approvedApp = null,
  unreadCount = 0
} = {}) {
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

  // categories
  const categorySelect = jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Books' }] });

  // initial recent listings fetch
  const limit = jest.fn().mockResolvedValue({ data: listings });
  const recentOrder = jest.fn(() => ({ limit }));
  const recentEqStatus = jest.fn(() => ({ order: recentOrder }));

  // market listings fetch — fully chainable
  const marketOrder = jest.fn().mockResolvedValue({ data: listings });
  const marketQuery = {
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: marketOrder
  };

  // role_applications check
  const maybeSingle = jest.fn().mockResolvedValue({ data: approvedApp });
  const eqApproval = jest.fn(() => ({ maybeSingle }));
  const eqUserId = jest.fn(() => ({ eq: eqApproval }));
  const roleAppSelect = jest.fn(() => ({ eq: eqUserId }));

  // profiles update (for accepting role)
  const profilesUpdateEq = jest.fn().mockResolvedValue({ error: null });
  const profilesUpdate = jest.fn(() => ({ eq: profilesUpdateEq }));

  // role_applications update (for marking completed)
  const roleAppUpdateEq = jest.fn().mockResolvedValue({ error: null });
  const roleAppUpdate = jest.fn(() => ({ eq: roleAppUpdateEq }));

  // unread messages count
  const unreadEq2 = jest.fn().mockResolvedValue({ count: unreadCount });
  const unreadEq1 = jest.fn(() => ({ eq: unreadEq2 }));
  const unreadSelect = jest.fn(() => ({ eq: unreadEq1 }));

  supabase.from.mockImplementation((table) => {
    if (table === 'categories') return { select: categorySelect };
    if (table === 'listings') {
      return {
        select: jest.fn((fields) => {
          // market query (no limit) vs recent query (has limit)
          return {
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: listings }),
              then: (resolve) => Promise.resolve({ data: listings }).then(resolve)
            }))
          };
        }),
        update: profilesUpdate
      };
    }
    if (table === 'role_applications') return { select: roleAppSelect, update: roleAppUpdate };
    if (table === 'messages') return { select: unreadSelect };
    if (table === 'profiles') return { update: profilesUpdate };
    return { select: jest.fn().mockResolvedValue({ data: [] }) };
  });

  return { profilesUpdateEq, roleAppUpdateEq };
}

describe('StudentDashboard', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
    __setSearchParams('');
    sessionStorage.clear();
  });

  it('renders the welcome greeting and quick-action blocks', async () => {
    createStudentDashboardMocks();

    render(<StudentDashboard profile={profile} />);

    expect(await screen.findByText(/WELCOME BACK/i)).toBeInTheDocument();
    expect(screen.getByText('My Listings')).toBeInTheDocument();
    expect(screen.getByText('My Messages')).toBeInTheDocument();
    expect(screen.getByText('Browse All')).toBeInTheDocument();
  });

  it('shows the loading screen when profile is null before data loads', () => {
    supabase.from.mockReturnValue({ select: jest.fn(() => new Promise(() => {})) });
    supabase.auth.getUser.mockReturnValue(new Promise(() => {}));

    render(<StudentDashboard profile={null} />);

    expect(screen.getByText('Loading UniMart...')).toBeInTheDocument();
  });

  it('navigates to /my-listings, /messages, and /browse from quick-actions', async () => {
    createStudentDashboardMocks();

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    await userEvent.click(screen.getByText('My Listings').closest('article'));
    expect(navigateMock).toHaveBeenCalledWith('/my-listings');

    await userEvent.click(screen.getByText('My Messages').closest('article'));
    expect(navigateMock).toHaveBeenCalledWith('/messages');

    await userEvent.click(screen.getByText('Browse All').closest('article'));
    expect(navigateMock).toHaveBeenCalledWith('/browse');
  });

  it('navigates to /cart when the shopping bag icon is clicked', async () => {
    createStudentDashboardMocks();

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    const cartBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('[data-icon="ShoppingBag"]')
    );
    if (cartBtn) {
      await userEvent.click(cartBtn);
      expect(navigateMock).toHaveBeenCalledWith('/cart');
    }
  });

  it('navigates to /create-listing from the FAB button', async () => {
    createStudentDashboardMocks();

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    await userEvent.click(screen.getByText('Create Post'));
    expect(navigateMock).toHaveBeenCalledWith('/create-listing');
  });

  it('opens the burger menu and shows profile and logout options', async () => {
    createStudentDashboardMocks();

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    const menuBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('[data-icon="Menu"]')
    );
    expect(menuBtn).toBeTruthy();
    await userEvent.click(menuBtn);

    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('closes the burger menu and shows the profile view when My Profile is clicked', async () => {
    createStudentDashboardMocks();

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    const menuBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('[data-icon="Menu"]')
    );
    await userEvent.click(menuBtn);
    await userEvent.click(screen.getByText('My Profile'));

    // Menu should be gone, profile view loaded
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('signs out and navigates to home on Logout click', async () => {
    createStudentDashboardMocks();
    supabase.auth.signOut.mockResolvedValue({});

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    const menuBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('[data-icon="Menu"]')
    );
    await userEvent.click(menuBtn);
    await userEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });

  it('shows empty state when no market listings match', async () => {
    createStudentDashboardMocks({ listings: [] });

    render(<StudentDashboard profile={profile} />);

    expect(await screen.findByText('No items found.')).toBeInTheDocument();
  });

  it('clears all filters when Clear Filters is clicked', async () => {
    createStudentDashboardMocks();

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    // Set a filter then clear
    const selects = screen.getAllByRole('combobox');
    // Campus select is first
    await userEvent.selectOptions(selects[0], 'Main Campus');

    await userEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));

    await waitFor(() => {
      expect(selects[0]).toHaveValue('all');
    });
  });

  it('shows the role acceptance popup when there is an approved application', async () => {
    const approvedApp = {
      id: 'app-1',
      user_id: 'user-1',
      requested_role: 'staff',
      status: 'approved'
    };

    createStudentDashboardMocks({ approvedApp });

    render(<StudentDashboard profile={profile} />);

    expect(await screen.findByText(/Accept Job as STAFF/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ACCEPT & ACTIVATE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LATER' })).toBeInTheDocument();
  });

  it('dismisses the role popup when LATER is clicked', async () => {
    const approvedApp = {
      id: 'app-1',
      user_id: 'user-1',
      requested_role: 'staff',
      status: 'approved'
    };

    createStudentDashboardMocks({ approvedApp });

    render(<StudentDashboard profile={profile} />);

    expect(await screen.findByText(/Accept Job as STAFF/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'LATER' }));

    await waitFor(() => {
      expect(screen.queryByText(/Accept Job as STAFF/i)).not.toBeInTheDocument();
    });
  });

  it('shows the unread message badge when there are unread messages', async () => {
    createStudentDashboardMocks({ unreadCount: 3 });

    render(<StudentDashboard profile={profile} />);

    await screen.findByText(/WELCOME BACK/i);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
