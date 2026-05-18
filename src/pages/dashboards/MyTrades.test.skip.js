import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyTrades from './MyTrades';
import { supabase } from '../../supabase';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

const assignedTrade = {
  id: 'trade-abc123',
  status: 'assigned',
  staff_id: 'staff-1',
  created_at: '2026-05-01T10:00:00.000Z'
};

const droppedOffTrade = {
  id: 'trade-def456',
  status: 'dropped_off',
  staff_id: 'staff-1',
  created_at: '2026-05-02T10:00:00.000Z'
};

const readyTrade = {
  id: 'trade-ghi789',
  status: 'ready_for_collection',
  staff_id: 'staff-1',
  created_at: '2026-05-03T10:00:00.000Z'
};

function createMyTradesMocks({ trades = [assignedTrade], updateError = null } = {}) {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'staff-1' } }
  });

  let fetchCallCount = 0;
  const orderFn = jest.fn().mockResolvedValue({ data: trades, error: null });
  const neqFn = jest.fn(() => ({ order: orderFn }));
  const eqStaffFn = jest.fn(() => ({ neq: neqFn }));
  const selectFn = jest.fn(() => ({ eq: eqStaffFn }));

  const updateEq = jest.fn().mockResolvedValue({ error: updateError });
  const update = jest.fn(() => ({ eq: updateEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'bookings') return { select: selectFn, update };
    throw new Error(`Unexpected table: ${table}`);
  });

  return { updateEq, update };
}

describe('MyTrades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page heading', async () => {
    createMyTradesMocks();

    render(<MyTrades />);

    expect(await screen.findByText('Manage assigned marketplace trades')).toBeInTheDocument();
  });

  it('renders the hero kicker MY TRADES', async () => {
    createMyTradesMocks();

    render(<MyTrades />);

    expect(await screen.findByText('MY TRADES')).toBeInTheDocument();
  });

  it('shows the assigned trade with Confirm Drop-Off button', async () => {
    createMyTradesMocks({ trades: [assignedTrade] });

    render(<MyTrades />);

    expect(await screen.findByText(/Trade #trade-a/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Drop-Off' })).toBeInTheDocument();
  });

  it('shows the dropped_off trade with Ready For Collection button', async () => {
    createMyTradesMocks({ trades: [droppedOffTrade] });

    render(<MyTrades />);

    expect(await screen.findByText(/Trade #trade-d/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ready For Collection' })).toBeInTheDocument();
  });

  it('shows the ready_for_collection trade with Complete Trade button', async () => {
    createMyTradesMocks({ trades: [readyTrade] });

    render(<MyTrades />);

    expect(await screen.findByText(/Trade #trade-g/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete Trade' })).toBeInTheDocument();
  });

  it('shows empty state when there are no assigned trades', async () => {
    createMyTradesMocks({ trades: [] });

    render(<MyTrades />);

    expect(await screen.findByText('No assigned trades.')).toBeInTheDocument();
  });

  it('advances an assigned trade to dropped_off on Confirm Drop-Off click', async () => {
    const { updateEq, update } = createMyTradesMocks({ trades: [assignedTrade] });

    render(<MyTrades />);

    await screen.findByRole('button', { name: 'Confirm Drop-Off' });

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Drop-Off' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ status: 'dropped_off' });
      expect(updateEq).toHaveBeenCalledWith('id', 'trade-abc123');
    });
  });

  it('advances a dropped_off trade to ready_for_collection', async () => {
    const { updateEq, update } = createMyTradesMocks({ trades: [droppedOffTrade] });

    render(<MyTrades />);

    await screen.findByRole('button', { name: 'Ready For Collection' });

    await userEvent.click(screen.getByRole('button', { name: 'Ready For Collection' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ status: 'ready_for_collection' });
      expect(updateEq).toHaveBeenCalledWith('id', 'trade-def456');
    });
  });

  it('completes a ready_for_collection trade', async () => {
    const { updateEq, update } = createMyTradesMocks({ trades: [readyTrade] });

    render(<MyTrades />);

    await screen.findByRole('button', { name: 'Complete Trade' });

    await userEvent.click(screen.getByRole('button', { name: 'Complete Trade' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ status: 'completed' });
      expect(updateEq).toHaveBeenCalledWith('id', 'trade-ghi789');
    });
  });

  it('fetches current user and trades on mount', async () => {
    createMyTradesMocks();

    render(<MyTrades />);

    await waitFor(() => {
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('bookings');
    });
  });

  it('displays the current status label for each trade', async () => {
    createMyTradesMocks({ trades: [assignedTrade] });

    render(<MyTrades />);

    expect(await screen.findByText(/assigned/)).toBeInTheDocument();
  });
});
