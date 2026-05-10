import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StaffDashboard from './StaffDashboard';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signOut: jest.fn()
    }
  }
}));

function createStaffDashboardMocks() {
  const categories = [
    { id: 1, name: 'Books' },
    { id: 2, name: 'Electronics' }
  ];
  const recentListings = [
    {
      id: 'recent-1',
      title: 'Recent Book',
      price: 90,
      categories: { name: 'Books' },
      listing_images: []
    }
  ];
  const marketListings = [
    {
      id: 'listing-1',
      title: 'Lamp',
      price: 120,
      category_id: 2,
      categories: { name: 'Electronics' },
      listing_images: [],
      profiles: { campus: 'Main Campus' }
    },
    {
      id: 'listing-2',
      title: 'Book',
      price: 80,
      category_id: 1,
      categories: { name: 'Books' },
      listing_images: [],
      profiles: { campus: 'Education Campus' }
    }
  ];

  const categorySelect = jest.fn().mockResolvedValue({ data: categories });
  const createListingsQuery = () => {
    let selectedCategory = null;

    const orderResult = {
      limit: jest.fn(() => Promise.resolve({ data: recentListings })),
      then: (resolve) =>
        resolve({
          data: selectedCategory
            ? marketListings.filter((item) => String(item.category_id) === String(selectedCategory))
            : marketListings
        })
    };

    const query = {
      eq: jest.fn((field, value) => {
        if (field === 'category_id') {
          selectedCategory = value;
        }

        return query;
      }),
      gte: jest.fn(() => query),
      lte: jest.fn(() => query),
      order: jest.fn(() => orderResult)
    };

    return { select: jest.fn(() => query) };
  };

  supabase.from.mockImplementation((table) => {
    if (table === 'categories') {
      return { select: categorySelect };
    }

    if (table === 'listings') {
      return createListingsQuery();
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    categories,
    marketListings
  };
}

describe('StaffDashboard', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
  });

  it('renders fetched listings and filters the market view', async () => {
    createStaffDashboardMocks();

    render(<StaffDashboard profile={{ full_name: 'Alex Staff' }} />);

    expect(await screen.findByText('Recent Book')).toBeInTheDocument();
    expect(screen.getByText('Lamp')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();

    const [campusSelect, categorySelect] = screen.getAllByRole('combobox');

    await userEvent.selectOptions(categorySelect, '1');
    await waitFor(() => {
      expect(screen.queryByText('Lamp')).not.toBeInTheDocument();
      expect(screen.getByText('Book')).toBeInTheDocument();
    });

    await userEvent.selectOptions(campusSelect, 'Main Campus');
    await waitFor(() => {
      expect(screen.queryByText('Book')).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));

    expect(await screen.findByText('Lamp')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
  });

  it('supports quick actions, burger menu actions, and logout', async () => {
    createStaffDashboardMocks();

    const { container } = render(<StaffDashboard profile={{ full_name: 'Alex Staff' }} />);

    await screen.findByText('Recent Book');

    fireEvent.click(screen.getByText('My Listings').closest('article'));
    fireEvent.click(screen.getByText('Messages').closest('article'));
    fireEvent.click(screen.getByText('Browse All').closest('article'));
    await userEvent.click(screen.getByText('Create Post'));

    expect(navigateMock).toHaveBeenCalledWith('/my-listings');
    expect(navigateMock).toHaveBeenCalledWith('/messages');
    expect(navigateMock).toHaveBeenCalledWith('/browse');
    expect(navigateMock).toHaveBeenCalledWith('/create-listing');

    await userEvent.click(container.querySelectorAll('.icon-btn')[2]);
    await userEvent.click(screen.getByRole('button', { name: /Settings/i }));

    expect(navigateMock).toHaveBeenCalledWith('/settings');

    supabase.auth.signOut.mockResolvedValue({});
    await userEvent.click(screen.getByRole('button', { name: /Logout/i }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });
});
