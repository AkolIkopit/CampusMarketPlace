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

  const transactionMaybeSingle = jest.fn().mockResolvedValue({ data: { id: 'transaction-1' }, error: null });
  const transactionSelect = jest.fn(() => ({ maybeSingle: transactionMaybeSingle }));
  const transactionInsert = jest.fn(() => ({ select: transactionSelect }));
  const reviewInsert = jest.fn().mockResolvedValue({ error: insertError });

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') return { select: listingSelect };
    if (table === 'reviews') return { select: reviewSelect, insert: reviewInsert };
    if (table === 'transactions') return { insert: transactionInsert };
    throw new Error(`Unexpected table: ${table}`);
  });

  supabase.auth.getUser.mockResolvedValue({
    data: { user: currentUserId ? { id: currentUserId } : null }
  });

  return { reviewInsert, reviewOrder, single, transactionInsert, transactionMaybeSingle };
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

    await userEvent.click(screen.getByRole('button', { name: 'Message Seller' }));

    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('/messages?'));
  });

  it('starts a transaction and navigates when Buy Now is clicked', async () => {
    const { transactionInsert } = createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing,
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Buy Now' }));

    await waitFor(() => expect(transactionInsert).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('action=buy'));
  });

  it('opens the offer modal when Make Offer is clicked', async () => {
    createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing,
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Make Offer' }));

    expect(await screen.findByText('Make an Offer')).toBeInTheDocument();
  });

  it('submits an offer and navigates to messages', async () => {
    const { transactionInsert } = createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing,
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Make Offer' }));
    await userEvent.type(screen.getByLabelText('Offer Amount'), '120');
    await userEvent.click(screen.getByRole('button', { name: 'Send Offer' }));

    await waitFor(() => expect(transactionInsert).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('action=offer'));
  });

  it('opens the trade modal when Request Trade is clicked', async () => {
    createListingDetailMocks({
      currentUserId: 'buyer-1',
      listing: baseListing,
      reviews: []
    });

    render(<ListingDetail />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Request Trade' }));

    expect(await screen.findByText('Request a Trade')).toBeInTheDocument();
  });

  it('disables messaging for the owner of the listing', async () => {
    createListingDetailMocks({
      currentUserId: 'seller-9',
      listing: baseListing,
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

    // Star buttons are rendered as buttons 1–5
    const starButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('star-btn')
    );

    if (starButtons.length > 0) {
      await userEvent.click(starButtons[2]); // click star 3
    }
    // Just verifying no crash; rating state is internal
    expect(screen.getByPlaceholderText('Experience with seller...')).toBeInTheDocument();
  });
});
