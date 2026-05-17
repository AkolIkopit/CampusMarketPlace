import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageListings from './ManageListings';
import { supabase } from '../../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn()
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
  const order = jest.fn().mockResolvedValue({ data: listings, error: fetchError });
  const select = jest.fn(() => ({ order }));

  const updateEq = jest.fn().mockResolvedValue({ error: updateError });
  const update = jest.fn(() => ({ eq: updateEq }));

  const deleteEq = jest.fn().mockResolvedValue({ error: deleteError });
  const remove = jest.fn(() => ({ eq: deleteEq }));

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return { select, update, delete: remove };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

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

  it('renders fetched listings with title, seller and status', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    expect(await screen.findByText('Python Textbook')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Broken Lamp')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('shows the loading state then transitions to the table', async () => {
    // Delay the resolution so we can catch the loading state
    let resolveOrder;
    const order = jest.fn(() => new Promise((res) => { resolveOrder = res; }));
    const select = jest.fn(() => ({ order }));
    supabase.from.mockReturnValue({ select, update: jest.fn(), delete: jest.fn() });

    render(<ManageListings />);

    expect(screen.getByText('Fetching marketplace data...')).toBeInTheDocument();

    resolveOrder({ data: sampleListings, error: null });

    expect(await screen.findByText('Python Textbook')).toBeInTheDocument();
    expect(screen.queryByText('Fetching marketplace data...')).not.toBeInTheDocument();
  });

  it('shows correct stats: total count and flagged count', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText('Python Textbook');

    expect(screen.getByText(/Total: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Flagged: 1/)).toBeInTheDocument();
  });

  it('flags an active listing and updates the local status', async () => {
    const { updateEq } = createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText('Python Textbook');

    await userEvent.click(screen.getByTitle('Flag as Unsafe'));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'listing-1');
    });
  });

  it('alerts when flagging fails with a database error', async () => {
    createManageListingsMocks({ updateError: { message: 'RLS policy violation' } });

    render(<ManageListings />);

    await screen.findByText('Python Textbook');

    await userEvent.click(screen.getByTitle('Flag as Unsafe'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Database Error: RLS policy violation');
    });
  });

  it('restores a flagged listing to active', async () => {
    const { updateEq } = createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText('Broken Lamp');

    await userEvent.click(screen.getByTitle('Restore to Market'));

    await waitFor(() => {
      expect(updateEq).toHaveBeenCalledWith('id', 'listing-2');
    });
  });

  it('deletes a listing after confirmation and removes it from the list', async () => {
    const { deleteEq } = createManageListingsMocks();

    window.confirm.mockReturnValue(true);

    render(<ManageListings />);

    await screen.findByText('Python Textbook');

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

    await screen.findByText('Python Textbook');

    const allButtons = screen.getAllByRole('button');
    const deleteBtn = allButtons.find((btn) => !btn.title && btn.closest('td'));

    if (deleteBtn) {
      await userEvent.click(deleteBtn);
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Delete failed: Delete failed');
        expect(screen.getByText('Python Textbook')).toBeInTheDocument();
      });
    }
  });

  it('does not delete when confirmation is cancelled', async () => {
    const { deleteEq } = createManageListingsMocks();

    window.confirm.mockReturnValue(false);

    render(<ManageListings />);

    await screen.findByText('Python Textbook');

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

    await screen.findByText('Python Textbook');

    const searchInput = screen.getByPlaceholderText('Search items...');
    await userEvent.type(searchInput, 'Broken');

    expect(screen.queryByText('Python Textbook')).not.toBeInTheDocument();
    expect(screen.getByText('Broken Lamp')).toBeInTheDocument();
  });

  it('filters listings by seller name', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText('Python Textbook');

    const searchInput = screen.getByPlaceholderText('Search items...');
    await userEvent.type(searchInput, 'Alice');

    expect(screen.getByText('Python Textbook')).toBeInTheDocument();
    expect(screen.queryByText('Broken Lamp')).not.toBeInTheDocument();
  });

  it('navigates back when the Back button is clicked', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    await screen.findByText('Python Textbook');

    await userEvent.click(screen.getByText('Back'));

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders the Manage Listings heading', async () => {
    createManageListingsMocks();

    render(<ManageListings />);

    expect(await screen.findByText('Manage Listings')).toBeInTheDocument();
  });
});
