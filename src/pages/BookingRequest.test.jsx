import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingRequest from './BookingRequest';
import { supabase } from '../supabase';
import { __resetRouterMocks, __setNavigateMock, __setSearchParams } from 'react-router-dom';

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
  title: 'Physics Textbook',
  price: 250,
  listing_type: 'Sale',
  location: 'Main Campus',
  seller_id: 'seller-1'
};

const baseSeller = {
  id: 'seller-1',
  full_name: 'Alice Seller',
  avatar_url: '',
  campus: 'Main Campus'
};

const futureSlotStart = new Date();
futureSlotStart.setDate(futureSlotStart.getDate() + 1);
futureSlotStart.setHours(10, 0, 0, 0);

const futureSlotEnd = new Date(futureSlotStart);
futureSlotEnd.setHours(12, 0, 0, 0);

const baseTradeSlots = [
  {
    id: 'slot-1',
    campus_name: 'Main Campus',
    start_time: futureSlotStart.toISOString(),
    end_time: futureSlotEnd.toISOString(),
    max_capacity: 5,
    current_bookings: 0,
    is_active: true
  }
];

function createBookingMocks({
  listing = baseListing,
  seller = baseSeller,
  currentUserId = 'buyer-1',
  listingError = null,
  sellerError = null,
  authError = null,
  insertError = null,
  messageInsertError = null,
  tradeSlots = baseTradeSlots
} = {}) {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: currentUserId ? { id: currentUserId } : null },
    error: authError
  });

  const listingMaybeSingle = jest.fn().mockResolvedValue({
    data: listingError ? null : listing,
    error: listingError
  });
  const listingEq = jest.fn(() => ({ maybeSingle: listingMaybeSingle }));
  const listingSelect = jest.fn(() => ({ eq: listingEq }));

  const sellerMaybeSingle = jest.fn().mockResolvedValue({
    data: sellerError ? null : seller,
    error: sellerError
  });
  const sellerEq = jest.fn(() => ({ maybeSingle: sellerMaybeSingle }));
  const sellerSelect = jest.fn(() => ({ eq: sellerEq }));

  const bookingsInsert = jest.fn().mockResolvedValue({ error: insertError });
  const messagesInsert = jest.fn().mockResolvedValue({ error: messageInsertError });
  const tradeSlotsOrder = jest.fn().mockResolvedValue({ data: tradeSlots, error: null });
  const tradeSlotsGte = jest.fn(() => ({ order: tradeSlotsOrder }));
  const tradeSlotsEqActive = jest.fn(() => ({ gte: tradeSlotsGte }));
  const tradeSlotsEqCampus = jest.fn(() => ({ eq: tradeSlotsEqActive }));
  const tradeSlotsSelect = jest.fn(() => ({ eq: tradeSlotsEqCampus }));
  const tradeSlotsUpdateEq = jest.fn().mockResolvedValue({ error: null });
  const tradeSlotsUpdate = jest.fn(() => ({ eq: tradeSlotsUpdateEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') return { select: listingSelect };
    if (table === 'profiles') return { select: sellerSelect };
    if (table === 'bookings') return { insert: bookingsInsert };
    if (table === 'messages') return { insert: messagesInsert };
    if (table === 'trade_slots') return { select: tradeSlotsSelect, update: tradeSlotsUpdate };
    throw new Error(`Unexpected table: ${table}`);
  });

  return { bookingsInsert, messagesInsert, tradeSlotsUpdate };
}

describe('BookingRequest', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
    __setSearchParams('listing=listing-1&seller=seller-1&item=Physics+Textbook&name=Alice+Seller');
  });

  it('renders the booking page title with the item name', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    expect(await screen.findByText(/Book a drop-off slot for/i)).toBeInTheDocument();
    expect(screen.getByText(/Physics Textbook/i)).toBeInTheDocument();
  });

  it('shows listing details once data loads', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    await waitFor(() => {
      expect(screen.getByText('Listing details')).toBeInTheDocument();
    });

    expect(screen.getByText('Physics Textbook')).toBeInTheDocument();
    expect(screen.getByText('R 250')).toBeInTheDocument();
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });

  it('shows seller details once data loads', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    await waitFor(() => {
      expect(screen.getByText('Alice Seller')).toBeInTheDocument();
    });

    const campusEls = screen.getAllByText(/Main Campus/i);
    expect(campusEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows a loading spinner while fetching data', () => {
    supabase.auth.getUser.mockReturnValue(new Promise(() => {}));
    supabase.from.mockReturnValue({ select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn(() => new Promise(() => {})) })) })) });

    render(<BookingRequest />);

    expect(screen.getByText('Loading booking details...')).toBeInTheDocument();
  });

  it('shows an error when no listing id is provided', async () => {
    __setSearchParams('');
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } }, error: null });
    supabase.from.mockReturnValue({ select: jest.fn() });

    render(<BookingRequest />);

    expect(await screen.findByText('No listing selected for booking.')).toBeInTheDocument();
  });

  it('shows an error when the listing cannot be loaded', async () => {
    createBookingMocks({ listingError: { message: 'Not found' } });

    render(<BookingRequest />);

    expect(await screen.findByText('Unable to load the selected listing.')).toBeInTheDocument();
  });

  it('shows an error when seller profile cannot be loaded', async () => {
    createBookingMocks({ sellerError: { message: 'Profile not found' } });

    render(<BookingRequest />);

    expect(await screen.findByText('Unable to load seller profile.')).toBeInTheDocument();
  });

  it('submits a booking request successfully and shows success message', async () => {
    const { bookingsInsert, messagesInsert } = createBookingMocks();

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    await userEvent.click(screen.getByRole('button', { name: 'Request booking' }));

    await waitFor(() => {
      expect(bookingsInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          listing_id: 'listing-1',
          buyer_id: 'buyer-1',
          seller_id: 'seller-1',
          status: 'requested',
          agreed_price: 250
        })
      ]);
    });

    expect(
      await screen.findByText(/Booking request submitted/i)
    ).toBeInTheDocument();

    expect(messagesInsert).toHaveBeenCalled();
  });

  it('shows an error when the user tries to book their own listing', async () => {
    createBookingMocks({ currentUserId: 'seller-1' });

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    await userEvent.click(screen.getByRole('button', { name: 'Request booking' }));

    expect(
      await screen.findByText('You cannot request a booking for your own listing.')
    ).toBeInTheDocument();
  });

  it('shows an error when insert fails', async () => {
    createBookingMocks({ insertError: { message: 'Booking conflict' } });

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    await userEvent.click(screen.getByRole('button', { name: 'Request booking' }));

    expect(await screen.findByText('Booking conflict')).toBeInTheDocument();
  });

  it('navigates back when the Back button is clicked', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    await userEvent.click(screen.getByRole('button', { name: /Back/i }));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders the slot selector with available time options', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    const slotSelect = screen.getByLabelText('Choose a drop-off slot');
    expect(slotSelect).toBeInTheDocument();
    expect(slotSelect.options.length).toBeGreaterThan(1);
  });

  it('allows entering an agreed price', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    const priceInput = screen.getByLabelText('Agreed price (R)');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '200');

    expect(priceInput).toHaveValue(200);
  });

  it('allows entering notes for seller or staff', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    const notesInput = screen.getByLabelText('Notes for seller / staff');
    await userEvent.type(notesInput, 'Please handle with care.');

    expect(notesInput).toHaveValue('Please handle with care.');
  });

  it('opens the messages page via the chat button', async () => {
    createBookingMocks();

    render(<BookingRequest />);

    await screen.findByText('Listing details');

    await userEvent.click(screen.getByRole('button', { name: 'Open related chat' }));

    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining('/messages?')
    );
  });
});
