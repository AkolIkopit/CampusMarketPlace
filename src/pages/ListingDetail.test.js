import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingDetail from './ListingDetail';
import { supabase } from '../supabase';
import {
  __resetRouterMocks,
  __setNavigateMock,
  __setParams
} from 'react-router-dom';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

function createListingDetailMocks({
  currentUserId = 'buyer-1',
  listing = null,
  reviews = [],
  insertError = null
} = {}) {
  const single = jest.fn().mockResolvedValue({ data: listing });
  const listingEq = jest.fn(() => ({ single }));
  const listingSelect = jest.fn(() => ({ eq: listingEq }));
  const reviewOrder = jest
    .fn()
    .mockResolvedValueOnce({ data: reviews })
    .mockResolvedValueOnce({ data: reviews });
  const reviewEq = jest.fn(() => ({ order: reviewOrder }));
  const reviewSelect = jest.fn(() => ({ eq: reviewEq }));
  const insert = jest.fn().mockResolvedValue({ error: insertError });

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return { select: listingSelect };
    }

    if (table === 'reviews') {
      return {
        select: reviewSelect,
        insert
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  supabase.auth.getUser.mockResolvedValue({
    data: { user: currentUserId ? { id: currentUserId } : null }
  });

  return {
    insert,
    reviewOrder,
    single
  };
}

describe('ListingDetail', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
    __setParams({ id: 'listing-1' });
  });

  it('shows a not-found state when Supabase does not return a listing', async () => {
    createListingDetailMocks();

    render(<ListingDetail />);

    expect(await screen.findByText('Listing not found.')).toBeInTheDocument();
  });

  it('renders the listing details and opens seller messaging', async () => {
    createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: {
        id: 'listing-1',
        seller_id: 'seller-9',
        title: 'Desk Lamp',
        price: 149.99,
        description: 'Bright desk lamp',
        location: 'Med Campus',
        categories: { name: 'Electronics' },
        profiles: { full_name: 'Alice Seller', avatar_url: '' },
        listing_images: []
      },
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();
    expect(screen.getByText('No reviews yet.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Message' }));

    expect(navigateMock).toHaveBeenCalledWith('/messages?user=seller-9');
  });

  it('disables messaging for the owner of the listing', async () => {
    createListingDetailMocks({
      currentUserId: 'seller-9',
      listing: {
        id: 'listing-1',
        seller_id: 'seller-9',
        title: 'Desk Lamp',
        price: 149.99,
        description: 'Bright desk lamp',
        location: 'Med Campus',
        categories: { name: 'Electronics' },
        profiles: { full_name: 'Alice Seller', avatar_url: '' },
        listing_images: []
      },
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByRole('button', { name: 'Your Listing' })).toBeDisabled();
  });

  it('submits a review and refreshes the listing data', async () => {
    const review = {
      id: 'review-1',
      rating: 5,
      comment: 'Smooth handoff',
      created_at: '2026-04-18T12:00:00.000Z',
      reviewer: { full_name: 'Buyer One', avatar_url: '' }
    };
    const { insert, reviewOrder } = createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: {
        id: 'listing-1',
        seller_id: 'seller-9',
        title: 'Desk Lamp',
        price: 149.99,
        description: 'Bright desk lamp',
        location: 'Med Campus',
        categories: { name: 'Electronics' },
        profiles: { full_name: 'Alice Seller', avatar_url: '' },
        listing_images: []
      },
      reviews: []
    });
    reviewOrder.mockReset();
    reviewOrder.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [review] });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Write a Review' }));
    await userEvent.type(screen.getByPlaceholderText('Experience with seller...'), 'Smooth handoff');
    await userEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => {
      expect(insert).toHaveBeenCalledWith([
        {
          listing_id: 'listing-1',
          reviewer_id: 'buyer-1',
          reviewee_id: 'seller-9',
          rating: 5,
          comment: 'Smooth handoff'
        }
      ]);
      expect(window.alert).toHaveBeenCalledWith('Review posted!');
      expect(screen.getByText('Smooth handoff')).toBeInTheDocument();
    });
  });
});
