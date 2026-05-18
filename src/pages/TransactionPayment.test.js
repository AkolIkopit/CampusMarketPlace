import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionPayment from './TransactionPayment';
import { supabase } from '../supabase';
import {
  __resetRouterMocks,
  __setNavigateMock,
  __setParams
} from 'react-router-dom';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('blueimp-md5', () => jest.fn(() => 'signed-hash'));

function mockTransaction(transaction) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: transaction, error: null });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  supabase.from.mockReturnValue({ select });
  return { maybeSingle };
}

const pendingTransaction = {
  id: 'tx-1',
  agreed_amount: 680,
  cash_shortfall_due: 680,
  payment_status: 'pending_payment',
  transaction_type: 'buy',
  listings: { title: 'Mechanical Keyboard' }
};

describe('TransactionPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRouterMocks();
    __setParams({ transactionId: 'tx-1' });
  });

  it('loads a pending transaction and shows the outstanding rand amount', async () => {
    mockTransaction(pendingTransaction);

    render(<TransactionPayment />);

    expect(await screen.findByText('Mechanical Keyboard')).toBeInTheDocument();
    expect(screen.getAllByText('R 680.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Pay R680.00 via PayFast/i })).toBeInTheDocument();
  });

  it('validates empty amounts before submitting to PayFast', async () => {
    mockTransaction(pendingTransaction);

    render(<TransactionPayment />);

    const amountInput = await screen.findByLabelText(/Amount to Pay/i);
    await userEvent.clear(amountInput);
    await userEvent.click(screen.getByRole('button', { name: /Pay R0.00 via PayFast/i }));
    expect(screen.getByText('Please enter a valid amount.')).toBeInTheDocument();
  });

  it('validates overpaid amounts before submitting to PayFast', async () => {
    mockTransaction(pendingTransaction);

    render(<TransactionPayment />);

    const amountInput = await screen.findByLabelText(/Amount to Pay/i);
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '700');
    await userEvent.click(screen.getByRole('button', { name: /Pay R700.00 via PayFast/i }));
    expect(screen.getByText('Payment amount cannot be more than the outstanding balance.')).toBeInTheDocument();
  });

  it('builds and submits the PayFast form for a valid payment', async () => {
    mockTransaction(pendingTransaction);
    const submit = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'form') element.submit = submit;
      return element;
    });

    render(<TransactionPayment />);

    await screen.findByText('Mechanical Keyboard');
    await userEvent.click(screen.getByRole('button', { name: /Pay R680.00 via PayFast/i }));

    expect(submit).toHaveBeenCalled();
    document.createElement.mockRestore();
  });

  it('shows complete-payment state and navigates back to messages', async () => {
    const navigate = jest.fn();
    __setNavigateMock(navigate);
    mockTransaction({
      ...pendingTransaction,
      cash_shortfall_due: 0,
      payment_status: 'FULLY_PAID'
    });

    render(<TransactionPayment />);

    expect(await screen.findByText(/Payment complete/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Back to Messages/i }));

    expect(navigate).toHaveBeenCalledWith('/messages');
  });

  it('shows an error when the transaction cannot be loaded', async () => {
    mockTransaction(null);

    render(<TransactionPayment />);

    await waitFor(() => {
      expect(screen.getByText('Transaction not found.')).toBeInTheDocument();
    });
  });
});
