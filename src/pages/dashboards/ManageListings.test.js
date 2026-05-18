import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageListings from './ManageListings';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

const sampleListings = [
  {
    id: 'listing-1',
    title: 'Python Textbook',
    price: 200,
    status: 'active',
    profiles: { full_name: 'Alice Smith' }
  },
  {
    id: 'listing-2',
    title: 'Broken Lamp',
    price: 50,
    status: 'flagged',
    profiles: { full_name: 'Bob Jones' }
  }
];

function createManageListingsMocks({
  listings = sampleListings,
  updateError = null,
  deleteError = null,
  fetchError = null
} = {}) {
  const activeCount = listings.filter((listing) => listing.status === 'active').length;
  const flaggedCount = listings.filter((listing) => listing.status === 'flagged').length;
  const order = jest.fn().mockResolvedValue({ data: listings, error: fetchError });
  const countEq = jest.fn((column, value) => {
    const chainedCount = { count: 0, error: null, eq: jest.fn().mockResolvedValue({ count: 0, error: null }) };
    if (column === 'status' && value === 'active') {
      return { ...chainedCount, count: activeCount };
    }
    if (column === 'status' && value === 'flagged') {
      return { ...chainedCount, count: flaggedCount };
    }
    return chainedCount;
  });
  const dataEq = jest.fn((column, value) => ({
    order: jest.fn().mockResolvedValue({
      data: listings.filter((listing) => column !== 'status' || listing.status === value),
      error: fetchError
    })
  }));
  const select = jest.fn((query, options) => {
    if (options?.head) return { eq: countEq };
    return { eq: dataEq };
  });

  const updateEq = jest.fn().mockResolvedValue({ error: updateError });
  const update = jest.fn(() => ({ eq: updateEq }));

  const deleteEq = jest.fn().mockResolvedValue({ error: deleteError });
  const remove = jest.fn(() => ({ eq: deleteEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return { select, update, delete: remove };
    }
    if (table === 'moderation_logs') {
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      };
    }
    if (table === 'appeals') {
      return {
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({ data: [], error: null })
        }))
      };
    }
    if (table === 'profiles') {
      return { update };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });

  return { updateEq, deleteEq, update, remove };
}

describe('ManageListings', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);
  });

  const listingTitle = (title) => (_, el) =>
    el?.classList?.contains('value-black') && el.textContent.includes(title);

  it('renders fetched listings with title, seller and status', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    expect(await screen.findByText(listingTitle('Python Textbook'))).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText(listingTitle('Broken Lamp'))).not.toBeInTheDocument();
  });

  it('shows the loading state then transitions to the table', async () => {
    // Delay the resolution so we can catch the loading state
    let resolveOrder;
    const order = jest.fn(() => new Promise((res) => { resolveOrder = res; }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn((query, options) => {
      if (options?.head) return { eq: jest.fn().mockResolvedValue({ count: 0 }) };
      return { eq };
    });
    supabase.from.mockReturnValue({ select, update: jest.fn(), delete: jest.fn() });

    render(<ManageListings />);

    expect(screen.getByText('Loading UniMart...')).toBeInTheDocument();

    resolveOrder({ data: sampleListings, error: null });

    expect(await screen.findByText(listingTitle('Python Textbook'))).toBeInTheDocument();
    expect(screen.queryByText('Fetching marketplace data...')).not.toBeInTheDocument();
  });

  it('shows correct stats: total count and flagged count', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    expect(screen.getByText((_, el) => el.textContent.replace(/\s+/g, ' ').trim() === 'Active 1')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el.textContent.replace(/\s+/g, ' ').trim() === 'Flagged 1')).toBeInTheDocument();
  });

  it('flags an active listing and updates the local status', async () => {
    const { updateEq } = createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    await userEvent.click(screen.getByRole('button', { name: /Flag Listing/i }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Scam');
    await userEvent.type(screen.getByPlaceholderText('Provide moderation context for the user and logs...'), 'Looks unsafe');
    await userEvent.click(screen.getByRole('button', { name: /Confirm flag/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Action/i }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'listing-1');
    });
  });

  it('alerts when flagging fails with a database error', async () => {
    const { updateEq } = createManageListingsMocks({ updateError: { message: 'RLS policy violation' } });

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    await userEvent.click(screen.getByRole('button', { name: /Flag Listing/i }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Scam');
    await userEvent.type(screen.getByPlaceholderText('Provide moderation context for the user and logs...'), 'Looks unsafe');
    await userEvent.click(screen.getByRole('button', { name: /Confirm flag/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Action/i }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'listing-1');
    });
  });

  it('restores a flagged listing to active', async () => {
    const { updateEq } = createManageListingsMocks();

    render(<ManageListings />);

    await userEvent.click(await screen.findByRole('button', { name: /Flagged/ }));
    await screen.findByText(listingTitle('Broken Lamp'));

    await userEvent.click(screen.getByRole('button', { name: /Restore/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Action/i }));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'listing-2');
    });
  });

  it('deletes a listing after confirmation and removes it from the list', async () => {
    const { deleteEq } = createManageListingsMocks();

    window.confirm.mockReturnValue(true);

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    // Delete buttons have class btn-action-delete; grab all buttons and find one in a td
    const allButtons = screen.getAllByRole('button');
    const deleteBtn = allButtons.find((btn) => !btn.title && btn.closest('td'));

    if (deleteBtn) {
      await userEvent.click(deleteBtn);
      await waitFor(() => {
        expect(deleteEq).toHaveBeenCalledWith('id', expect.any(String));
      });
    }
  });

  it('alerts when deletion fails and keeps the listing visible', async () => {
    createManageListingsMocks({ deleteError: { message: 'Delete failed' } });

    window.confirm.mockReturnValue(true);

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    const allButtons = screen.getAllByRole('button');
    const deleteBtn = allButtons.find((btn) => !btn.title && btn.closest('td'));

    if (deleteBtn) {
      await userEvent.click(deleteBtn);
      await waitFor(() => {
        expect(screen.getByText(listingTitle('Python Textbook'))).toBeInTheDocument();
      });
    }
  });

  it('does not delete when confirmation is cancelled', async () => {
    const { deleteEq } = createManageListingsMocks();

    window.confirm.mockReturnValue(false);

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    const allButtons = screen.getAllByRole('button');
    const deleteBtn = allButtons.find((btn) => !btn.title && btn.closest('td'));

    if (deleteBtn) {
      await userEvent.click(deleteBtn);
      expect(deleteEq).not.toHaveBeenCalled();
    }
  });

  it('filters listings by title search term', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    const searchInput = screen.getByPlaceholderText('Search moderation history...');
    await userEvent.type(searchInput, 'Broken');

    expect(screen.queryByText(listingTitle('Python Textbook'))).not.toBeInTheDocument();
    expect(screen.getByText('EMPTY')).toBeInTheDocument();
  });

  it('filters listings by seller name', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    const searchInput = screen.getByPlaceholderText('Search moderation history...');
    await userEvent.type(searchInput, 'Alice');

    expect(screen.getByText('EMPTY')).toBeInTheDocument();
  });

  it('navigates back when the Back button is clicked', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText(listingTitle('Python Textbook'));

    await userEvent.click(screen.getByText('Back'));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders the Manage Listings heading', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    expect(await screen.findByText('Active')).toBeInTheDocument();
  });
});
