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
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    document.querySelectorAll('form').forEach((form) => form.remove());
    process.env = {
      ...originalEnv,
      REACT_APP_PAYFAST_MODE: 'sandbox',
      REACT_APP_PAYFAST_MERCHANT_ID: '10000100',
      REACT_APP_PAYFAST_MERCHANT_KEY: 'abc123def4567',
      REACT_APP_PAYFAST_PASSPHRASE: 'secret',
      REACT_APP_PAYFAST_RETURN_URL: 'https://example.com/payment/success',
      REACT_APP_PAYFAST_CANCEL_URL: 'https://example.com/payment/cancel',
      REACT_APP_NOTIFY_URL: 'https://example.supabase.co/functions/v1/payfast-notify'
    };
    __resetRouterMocks();
    __setParams({ transactionId: 'tx-1' });
  });

  afterEach(() => {
    document.querySelectorAll('form').forEach((form) => form.remove());
    if (document.createElement.mockRestore) {
      document.createElement.mockRestore();
    }
  });

  afterAll(() => {
    process.env = originalEnv;
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
    expect(document.querySelector('form').action).toBe('https://sandbox.payfast.co.za/eng/process');
    expect(document.querySelector('input[name="merchant_id"]').value).toBe('10000100');
    expect(document.querySelector('input[name="merchant_key"]').value).toBe('abc123def4567');
    expect(document.querySelector('input[name="custom_str1"]').value).toBe('tx-1');
    document.createElement.mockRestore();
  });

  it('fails gracefully when PayFast credentials are missing', async () => {
    process.env.REACT_APP_PAYFAST_MERCHANT_ID = '';
    mockTransaction(pendingTransaction);

    render(<TransactionPayment />);

    await screen.findByText('Mechanical Keyboard');
    await userEvent.click(screen.getByRole('button', { name: /Pay R680.00 via PayFast/i }));

    expect(screen.getByText('Payment is not configured correctly. Please contact support.')).toBeInTheDocument();
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

  it('does not treat an unpaid zero-shortfall transaction as payment complete', async () => {
    mockTransaction({
      ...pendingTransaction,
      cash_shortfall_due: 0,
      payment_status: 'unpaid'
    });

    render(<TransactionPayment />);

    expect(await screen.findByText('Mechanical Keyboard')).toBeInTheDocument();
    expect(screen.queryByText(/Payment complete/i)).not.toBeInTheDocument();
  });

  it('shows an error when the transaction cannot be loaded', async () => {
    mockTransaction(null);

    render(<TransactionPayment />);

    await waitFor(() => {
      expect(screen.getByText('Transaction not found.')).toBeInTheDocument();
    });
  });
});