import { render, screen } from '@testing-library/react';
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

function mockTransactionStatus(transaction) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: transaction, error: null });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  supabase.from.mockReturnValue({ select });
  return { select, eq, maybeSingle };
}

describe('PaymentSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    __resetRouterMocks();
  });

  it('shows confirmed state when the backend payment status is fully paid', async () => {
    __setSearchParams('transaction=tx-1');
    mockTransactionStatus({ payment_status: 'FULLY_PAID', cash_shortfall_due: 0 });

    render(<PaymentSuccess />);

    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
    expect(screen.getByText(/listing and chat have been updated/i)).toBeInTheDocument();
  });

  it('does not update payment records from the return page', async () => {
    __setSearchParams('transaction=tx-1&pf_payment_id=pay-1&amount=680');
    mockTransactionStatus({ payment_status: 'FULLY_PAID', cash_shortfall_due: 0 });

    render(<PaymentSuccess />);

    await screen.findByText('Payment Successful');
    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(supabase.from().update).toBeUndefined();
  });

  it('shows processing state without a transaction id and can return to messages', async () => {
    const navigate = jest.fn();
    __setNavigateMock(navigate);
    __setSearchParams('');

    render(<PaymentSuccess />);

    expect(await screen.findByText('Payment Processing')).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Back to Messages/i }));
    expect(navigate).toHaveBeenCalledWith('/messages');
  });

  it('keeps processing state when backend status is still unpaid even with zero shortfall', async () => {
    jest.useFakeTimers();
    __setSearchParams('transaction=tx-1');
    mockTransactionStatus({ payment_status: 'unpaid', cash_shortfall_due: 0 });

    render(<PaymentSuccess />);

    expect(await screen.findByText('Payment Processing')).toBeInTheDocument();

    jest.runOnlyPendingTimers();
    expect(screen.queryByText('Payment Successful')).not.toBeInTheDocument();
  });
});