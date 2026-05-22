import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentSuccess from './PaymentSuccess';
import { supabase } from '../supabase';
import {
  __resetRouterMocks,
  __setNavigateMock,
  __setSearchParams
} from 'react-router-dom';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const transaction = {
  id: 'tx-1',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  listing_id: 'listing-1',
  agreed_amount: 680,
  cash_shortfall_due: 680,
  listings: { title: 'Mechanical Keyboard' }
};

function chainSingle(data) {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue({ data, error: null })
      }))
    }))
  };
}

function updateChain(updateSpy) {
  return {
    update: jest.fn((payload) => {
      updateSpy(payload);
      return { eq: jest.fn().mockResolvedValue({ error: null }) };
    })
  };
}

function createPaymentSuccessMocks({ tx = transaction } = {}) {
  const transactionUpdate = jest.fn();
  const bookingsUpdate = jest.fn();
  const messagesInsert = jest.fn().mockResolvedValue({ error: null });

  supabase.from.mockImplementation((table) => {
    if (table === 'transactions') {
      return {
        ...chainSingle(tx),
        ...updateChain(transactionUpdate)
      };
    }
    if (table === 'bookings') {
      return updateChain(bookingsUpdate);
    }
    if (table === 'profiles') {
      return chainSingle({ full_name: table === 'profiles' ? 'Thato Khoza' : 'A student' });
    }
    if (table === 'messages') {
      return { insert: messagesInsert };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { transactionUpdate, bookingsUpdate, messagesInsert };
}

describe('PaymentSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRouterMocks();
  });

  it('marks a full payment as fully paid and inserts a system message', async () => {
    __setSearchParams('transaction=tx-1&pf_payment_id=pay-1&amount=680');
    const { transactionUpdate, bookingsUpdate, messagesInsert } = createPaymentSuccessMocks();

    render(<PaymentSuccess />);

    expect(await screen.findByText(/Your payment has been received/i)).toBeInTheDocument();

    expect(transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      payment_status: 'FULLY_PAID',
      cash_shortfall_due: 0,
      payment_reference: 'pay-1'
    }));
    expect(bookingsUpdate).toHaveBeenCalledWith(expect.objectContaining({
      amount_paid: 680,
      cash_shortfall: 0
    }));
    expect(messagesInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        message_text: expect.stringContaining('[SYSTEM]')
      })
    ]);
  });

  it('keeps payment pending when only part of the balance is paid', async () => {
    __setSearchParams('transaction=tx-1&amount=200');
    const { transactionUpdate, bookingsUpdate } = createPaymentSuccessMocks();

    render(<PaymentSuccess />);

    await waitFor(() => {
      expect(transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({
        payment_status: 'pending_payment',
        cash_shortfall_due: 480
      }));
    });
    expect(bookingsUpdate).toHaveBeenCalledWith(expect.objectContaining({
      amount_paid: 200,
      cash_shortfall: 480
    }));
  });

  it('does not update payment records without a transaction id and can return to messages', async () => {
    const navigate = jest.fn();
    __setNavigateMock(navigate);
    __setSearchParams('');
    createPaymentSuccessMocks();

    render(<PaymentSuccess />);

    expect(await screen.findByText(/Your payment has been received/i)).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Back to Messages/i }));
    expect(navigate).toHaveBeenCalledWith('/messages');
  });
});
