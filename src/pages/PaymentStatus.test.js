import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentStatus from './PaymentStatus';
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

function createPaymentMocks({ cartItems = [], insertError = null } = {}) {
  const user = { id: 'user-1' };

  supabase.auth.getUser.mockResolvedValue({ data: { user } });

  const cartEq = jest.fn().mockResolvedValue({ data: cartItems, error: null });
  const cartSelect = jest.fn(() => ({ eq: cartEq }));

  const insert = jest.fn().mockResolvedValue({ error: insertError });

  const updateIn = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn(() => ({ in: updateIn }));

  const deleteEq = jest.fn().mockResolvedValue({ error: null });
  const remove = jest.fn(() => ({ eq: deleteEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'cart_items') return { select: cartSelect, delete: remove };
    if (table === 'transactions') return { insert };
    if (table === 'listings') return { update };
    throw new Error(`Unexpected table: ${table}`);
  });

  return { insert, updateIn, deleteEq };
}

describe('PaymentStatus', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
  });

  it('shows the cancelled state when type=cancel', () => {
    __setSearchParams('type=cancel');

    createPaymentMocks();

    render(<PaymentStatus />);

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to Cart' })).toBeInTheDocument();
  });

  it('navigates back to cart on the cancel screen', async () => {
    __setSearchParams('type=cancel');

    createPaymentMocks();

    render(<PaymentStatus />);

    await userEvent.click(screen.getByRole('button', { name: 'Return to Cart' }));
    expect(navigateMock).toHaveBeenCalledWith('/cart', { replace: true });
  });

  it('shows processing then success after a successful payment', async () => {
    __setSearchParams('type=success');

    const cartItems = [
      {
        listing_id: 'listing-1',
        listings: { seller_id: 'seller-1', price: 500 }
      }
    ];

    const { insert, updateIn, deleteEq } = createPaymentMocks({ cartItems });

    render(<PaymentStatus />);

    expect(await screen.findByText('Success!')).toBeInTheDocument();

    expect(insert).toHaveBeenCalledWith([
      {
        buyer_id: 'user-1',
        seller_id: 'seller-1',
        listing_id: 'listing-1',
        amount: 500,
        status: 'paid'
      }
    ]);
    expect(updateIn).toHaveBeenCalledWith('id', ['listing-1']);
    expect(deleteEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('navigates to the student dashboard after a successful payment', async () => {
    __setSearchParams('type=success');

    createPaymentMocks({ cartItems: [] });

    render(<PaymentStatus />);

    expect(await screen.findByText('Success!')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/student', { replace: true });
  });
});
