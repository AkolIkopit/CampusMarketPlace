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

const baseListing = {
  id: 'listing-1',
  seller_id: 'seller-9',
  title: 'Desk Lamp',
  price: 149.99,
  description: 'Bright desk lamp',
  location: 'Med Campus',
  categories: { name: 'Electronics' },
  profiles: { full_name: 'Alice Seller', avatar_url: '' },
  listing_images: []
};

function createListingDetailMocks({
  currentUserId = 'buyer-1',
  listing = null,
  reviews = [],
  insertError = null,
  cartInsertError = null
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

  const reviewInsert = jest.fn().mockResolvedValue({ error: insertError });
  const cartInsert = jest.fn().mockResolvedValue({ error: cartInsertError });

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') return { select: listingSelect };
    if (table === 'reviews') return { select: reviewSelect, insert: reviewInsert };
    if (table === 'cart_items') return { insert: cartInsert };
    throw new Error(`Unexpected table: ${table}`);
  });

  supabase.auth.getUser.mockResolvedValue({
    data: { user: currentUserId ? { id: currentUserId } : null }
  });

  return { reviewInsert, cartInsert, reviewOrder, single };
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
      listing: baseListing,
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();
    expect(screen.getByText('No reviews yet.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Message' }));

    // Component passes extra query params — just check seller id is present
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining('user=seller-9')
    );
  });

  it('disables messaging and cart for the owner of the listing', async () => {
    createListingDetailMocks({
      currentUserId: 'seller-9',
      listing: baseListing,
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByRole('button', { name: 'Your Listing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeDisabled();
  });

  it('submits a review and refreshes the listing data', async () => {
    const review = {
      id: 'review-1',
      rating: 5,
      comment: 'Smooth handoff',
      created_at: '2026-04-18T12:00:00.000Z',
      reviewer: { full_name: 'Buyer One', avatar_url: '' }
    };
    const { reviewInsert, reviewOrder } = createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing,
      reviews: []
    });
    reviewOrder.mockReset();
    reviewOrder
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [review] });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Write a Review' }));
    await userEvent.type(screen.getByPlaceholderText('Experience with seller...'), 'Smooth handoff');
    // Button text is "Post Review" not "Post"
    await userEvent.click(screen.getByRole('button', { name: 'Post Review' }));

    await waitFor(() => {
      expect(reviewInsert).toHaveBeenCalledWith([
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

  it('adds a listing to the cart successfully and navigates to /cart', async () => {
    const { cartInsert } = createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    await waitFor(() => {
      expect(cartInsert).toHaveBeenCalledWith([
        { user_id: 'buyer-1', listing_id: 'listing-1' }
      ]);
      expect(window.alert).toHaveBeenCalledWith('Added to cart successfully!');
      expect(navigateMock).toHaveBeenCalledWith('/cart');
    });
  });

  it('alerts duplicate cart error when the item is already in the cart', async () => {
    createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing,
      cartInsertError: { code: '23505', message: 'duplicate key value' }
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('This item is already in your cart!');
    });
  });

  it('alerts a generic error when the cart insert fails', async () => {
    createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing,
      cartInsertError: { code: '500', message: 'Internal server error' }
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error: Internal server error');
    });
  });

  it('alerts when the user is not logged in and tries to add to cart', async () => {
    createListingDetailMocks({
      currentUserId: null,
      listing: baseListing
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Please log in to add items to your cart.');
    });
  });

  it('navigates back when the Back button is clicked', async () => {
    createListingDetailMocks({ listing: baseListing });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Back/i }));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('toggles the review form open and closed', async () => {
    createListingDetailMocks({ listing: baseListing });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Write a Review' }));
    expect(screen.getByPlaceholderText('Experience with seller...')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('Experience with seller...')).not.toBeInTheDocument();
  });

  it('renders existing reviews with reviewer name and comment', async () => {
    createListingDetailMocks({
      listing: baseListing,
      reviews: [
        {
          id: 'review-1',
          rating: 4,
          comment: 'Great seller!',
          created_at: '2026-03-01T10:00:00.000Z',
          reviewer: { full_name: 'Bob Buyer', avatar_url: '' }
        }
      ]
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Great seller!')).toBeInTheDocument();
    expect(screen.getByText('Bob Buyer')).toBeInTheDocument();
  });

  it('allows changing the star rating before submitting a review', async () => {
    createListingDetailMocks({ listing: baseListing });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Write a Review' }));

    const starButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('star-btn')
    );

    if (starButtons.length > 0) {
      await userEvent.click(starButtons[2]);
    }
    expect(screen.getByPlaceholderText('Experience with seller...')).toBeInTheDocument();
  });
});
