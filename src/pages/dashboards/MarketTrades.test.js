import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketTrades from './MarketTrades';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

const pendingTrade = {
  id: 'trade-abc123',
  status: 'requested',
  staff_id: null,
  created_at: '2026-05-01T10:00:00.000Z',
  listings: { title: 'Desk Lamp', description: 'Small lamp' },
  seller: { full_name: 'Sarah Seller' },
  buyer: { full_name: 'Ben Buyer' }
};

const assignedTrade = {
  id: 'trade-def456',
  status: 'assigned',
  staff_id: 'staff-1',
  created_at: '2026-05-02T10:00:00.000Z',
  listings: { title: 'Assigned Item', description: 'Already claimed' },
  seller: { full_name: 'Sarah Seller' },
  buyer: { full_name: 'Ben Buyer' }
};

const completedTrade = {
  id: 'trade-ghi789',
  status: 'completed',
  staff_id: 'staff-1',
  created_at: '2026-05-03T10:00:00.000Z',
  listings: { title: 'Completed Item', description: 'Done' },
  seller: { full_name: 'Sarah Seller' },
  buyer: { full_name: 'Ben Buyer' }
};

function createMarketTradesMocks({
  pendingTrades = [pendingTrade],
  completedTrades = [completedTrade],
  updateError = null
} = {}) {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'staff-1' } }
  });

  // pending bookings: neq(status, completed)
  const pendingLimit = jest.fn(); // not used in pending path
  const pendingOrder = jest.fn().mockResolvedValue({ data: pendingTrades, error: null });
  const pendingNeq = jest.fn(() => ({ order: pendingOrder }));
  const pendingSelect = jest.fn(() => ({ neq: pendingNeq }));

  // completed bookings: eq(status, completed)
  const completedLimit = jest.fn().mockResolvedValue({ data: completedTrades, error: null });
  const completedOrder = jest.fn(() => ({ limit: completedLimit }));
  const completedEq = jest.fn(() => ({ order: completedOrder }));

  // We need to distinguish pending vs completed select calls.
  // The component calls from('bookings') twice: once with neq, once with eq.
  let selectCallCount = 0;
  const dynamicSelect = jest.fn(() => {
    selectCallCount++;
    if (selectCallCount % 2 === 1) {
      // first call -> pending path
      return { neq: pendingNeq };
    } else {
      // second call -> completed path
      return { eq: completedEq };
    }
  });

  const updateEq = jest.fn().mockResolvedValue({ error: updateError });
  const update = jest.fn(() => ({ eq: updateEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'bookings') return { select: dynamicSelect, update };
    throw new Error(`Unexpected table: ${table}`);
  });

  return { updateEq, update };
}

describe('MarketTrades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page heading', async () => {
    createMarketTradesMocks();

    render(<MarketTrades />);

    expect(await screen.findByText('Marketplace Sales & Trades')).toBeInTheDocument();
  });

  it('renders pending and completed section headings', async () => {
    createMarketTradesMocks();

    render(<MarketTrades />);

    expect(await screen.findByText('Pending Sales & Trades')).toBeInTheDocument();
    expect(screen.getByText('Completed Sales & Trades')).toBeInTheDocument();
  });

  it('shows a pending trade with FREE staff status and Claim button', async () => {
    createMarketTradesMocks({ pendingTrades: [pendingTrade] });

    render(<MarketTrades />);

    expect(await screen.findByText('Desk Lamp')).toBeInTheDocument();
    expect(screen.getByText(/FREE/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim Sale / Trade' })).toBeInTheDocument();
  });

  it('shows TAKEN label for an already-assigned trade without Claim button', async () => {
    createMarketTradesMocks({ pendingTrades: [assignedTrade] });

    render(<MarketTrades />);

    expect(await screen.findByText(/TAKEN/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim Sale / Trade' })).not.toBeInTheDocument();
  });

  it('shows empty state when there are no pending trades', async () => {
    createMarketTradesMocks({ pendingTrades: [] });

    render(<MarketTrades />);

    expect(await screen.findByText('No pending sales or trades.')).toBeInTheDocument();
  });

  it('shows empty state when there are no completed trades', async () => {
    createMarketTradesMocks({ completedTrades: [] });

    render(<MarketTrades />);

    expect(await screen.findByText('No completed sales or trades.')).toBeInTheDocument();
  });

  it('claims a trade after user confirms the dialog', async () => {
    const { updateEq } = createMarketTradesMocks({ pendingTrades: [pendingTrade] });
    window.confirm.mockReturnValue(true);

    render(<MarketTrades />);

    await screen.findByRole('button', { name: 'Claim Sale / Trade' });

    await userEvent.click(screen.getByRole('button', { name: 'Claim Sale / Trade' }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'trade-abc123');
    });
  });

  it('does not claim a trade when the user cancels the dialog', async () => {
    const { updateEq } = createMarketTradesMocks({ pendingTrades: [pendingTrade] });
    window.confirm.mockReturnValue(false);

    render(<MarketTrades />);

    await screen.findByRole('button', { name: 'Claim Sale / Trade' });

    await userEvent.click(screen.getByRole('button', { name: 'Claim Sale / Trade' }));

    expect(updateEq).not.toHaveBeenCalled();
  });

  it('renders the completed trade entry', async () => {
    createMarketTradesMocks({ completedTrades: [completedTrade] });

    render(<MarketTrades />);

    expect(await screen.findByText('Completed Item')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('fetches current user on mount', async () => {
    createMarketTradesMocks();

    render(<MarketTrades />);

    await waitFor(() => {
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });
  });
});
