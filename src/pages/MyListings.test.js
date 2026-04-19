import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyListings from './MyListings';
import { supabase } from '../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

function createMyListingsMocks({
  listings = [],
  deleteError = null
} = {}) {
  const order = jest.fn().mockResolvedValue({ data: listings, error: null });
  const eqForSelect = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq: eqForSelect }));
  const deleteEq = jest.fn().mockResolvedValue({ error: deleteError });
  const remove = jest.fn(() => ({ eq: deleteEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return {
        select,
        delete: remove
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'seller-1' } }
  });

  return {
    deleteEq,
    eqForSelect,
    order,
    remove,
    select
  };
}

describe('MyListings', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
  });

  it('shows the empty state when the user has no listings', async () => {
    createMyListingsMocks();

    render(<MyListings />);

    expect(await screen.findByText("You haven't posted anything yet.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Create your first post' }));

    expect(navigateMock).toHaveBeenCalledWith('/create-listing');
  });

  it('renders listings and removes one after a confirmed delete', async () => {
    const listing = {
      id: 'listing-1',
      title: 'Desk Lamp',
      price: 149.99,
      categories: { name: 'Electronics' },
      listing_images: [],
      reviews: [
        {
          id: 'review-1',
          comment: 'Fast and friendly',
          reviewer: { full_name: 'Alice Jones', avatar_url: '' }
        },
        {
          id: 'review-2',
          comment: 'Would buy again',
          reviewer: { full_name: 'Bob Stone', avatar_url: '/bob.png' }
        },
        {
          id: 'review-3',
          comment: 'Smooth handoff',
          reviewer: { full_name: 'Cara West', avatar_url: '' }
        }
      ]
    };
    const { deleteEq } = createMyListingsMocks({ listings: [listing] });

    window.confirm.mockReturnValue(true);

    const { container } = render(<MyListings />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();
    expect(screen.getByText('+1 more reviews...')).toBeInTheDocument();

    await userEvent.click(container.querySelector('.delete-btn'));

    await waitFor(() => {
      expect(deleteEq).toHaveBeenCalledWith('id', 'listing-1');
      expect(screen.queryByText('Desk Lamp')).not.toBeInTheDocument();
    });
  });

  it('shows the Supabase delete error without removing the card', async () => {
    const listing = {
      id: 'listing-1',
      title: 'Desk Lamp',
      price: 149.99,
      categories: { name: 'Electronics' },
      listing_images: [],
      reviews: []
    };

    createMyListingsMocks({
      listings: [listing],
      deleteError: { message: 'Delete failed' }
    });

    window.confirm.mockReturnValue(true);

    const { container } = render(<MyListings />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(container.querySelector('.delete-btn'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Delete failed');
      expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
    });
  });
});
