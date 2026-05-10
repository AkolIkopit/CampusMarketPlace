import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartPage from './CartPage';
import { supabase } from '../supabase';
import { __resetRouterMocks, __setNavigateMock } from 'react-router-dom';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}));

const cartItemWithListing = (id, title, price, category = 'Books') => ({
  id,
  listings: {
    id: `listing-${id}`,
    title,
    price,
    categories: { name: category },
    listing_images: [],
    seller_id: 'seller-1'
  }
});

function createCartMocks({ items = [], deleteError = null } = {}) {
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

  const deleteEq = jest.fn().mockResolvedValue({ error: deleteError });
  const remove = jest.fn(() => ({ eq: deleteEq }));

  const eqForSelect = jest.fn().mockResolvedValue({ data: items, error: null });
  const select = jest.fn(() => ({ eq: eqForSelect }));

  supabase.from.mockImplementation((table) => {
    if (table === 'cart_items') return { select, delete: remove };
    throw new Error(`Unexpected table: ${table}`);
  });

  return { deleteEq, remove };
}

describe('CartPage', () => {
  let navigateMock;

  // Capture form submissions to PayFast instead of letting them fire
  let appendChildSpy;
  let submitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    __resetRouterMocks();
    __setNavigateMock(navigateMock);

    submitSpy = jest.fn();
    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node.tagName === 'FORM') {
        // Replace submit so the browser doesn't actually navigate
        node.submit = submitSpy;
      }
      return node;
    });
  });

  afterEach(() => {
    appendChildSpy.mockRestore();
  });

  it('shows the empty cart state when there are no items', async () => {
    createCartMocks({ items: [] });

    render(<CartPage />);

    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('navigates to the student dashboard via Browse Items when empty', async () => {
    createCartMocks({ items: [] });

    render(<CartPage />);

    await screen.findByText('Your cart is empty.');

    await userEvent.click(screen.getByText('Browse Items'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/student');
  });

  it('navigates back to the student dashboard via Continue Shopping', async () => {
    createCartMocks({ items: [] });

    render(<CartPage />);

    await screen.findByText('Your cart is empty.');

    await userEvent.click(screen.getByText('Continue Shopping'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/student');
  });

  it('renders cart items with title, category and price', async () => {
    createCartMocks({
      items: [
        cartItemWithListing('cart-1', 'Chemistry Textbook', 250, 'Books'),
        cartItemWithListing('cart-2', 'Scientific Calculator', 180, 'Electronics')
      ]
    });

    render(<CartPage />);

    expect(await screen.findByText('Chemistry Textbook')).toBeInTheDocument();
    expect(screen.getByText('Scientific Calculator')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('shows the correct subtotal for all cart items', async () => {
    createCartMocks({
      items: [
        cartItemWithListing('cart-1', 'Textbook', 250),
        cartItemWithListing('cart-2', 'Calculator', 180)
      ]
    });

    render(<CartPage />);

    await screen.findByText('Textbook');

    // Subtotal (430.00) should appear twice — once in summary rows, once in total
    const totals = screen.getAllByText('R 430.00');
    expect(totals.length).toBeGreaterThanOrEqual(1);
  });

  it('removes an item and updates the cart', async () => {
    const { deleteEq } = createCartMocks({
      items: [cartItemWithListing('cart-1', 'Old Laptop', 3000, 'Electronics')]
    });

    render(<CartPage />);

    expect(await screen.findByText('Old Laptop')).toBeInTheDocument();

    await userEvent.click(screen.getByTitle('Remove item'));

    await waitFor(() => {
      expect(deleteEq).toHaveBeenCalledWith('id', 'cart-1');
      expect(screen.queryByText('Old Laptop')).not.toBeInTheDocument();
    });
  });

  it('does not remove an item when supabase returns an error', async () => {
    createCartMocks({
      items: [cartItemWithListing('cart-1', 'Faulty Item', 100)],
      deleteError: { message: 'Delete failed' }
    });

    render(<CartPage />);

    expect(await screen.findByText('Faulty Item')).toBeInTheDocument();

    await userEvent.click(screen.getByTitle('Remove item'));

    // Item should still be there since the delete errored
    await waitFor(() => {
      expect(screen.getByText('Faulty Item')).toBeInTheDocument();
    });
  });

  it('submits a PayFast form on CHECKOUT when cart has items', async () => {
    createCartMocks({
      items: [cartItemWithListing('cart-1', 'Lamp', 299)]
    });

    render(<CartPage />);

    expect(await screen.findByText('Lamp')).toBeInTheDocument();

    await userEvent.click(screen.getByText('CHECKOUT'));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
    });
  });

  it('renders the Order Summary sidebar with Trade Fee FREE label', async () => {
    createCartMocks({
      items: [cartItemWithListing('cart-1', 'Lamp', 299)]
    });

    render(<CartPage />);

    await screen.findByText('Lamp');

    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
  });

  it('shows the item count in the page header', async () => {
    createCartMocks({
      items: [
        cartItemWithListing('cart-1', 'Item A', 100),
        cartItemWithListing('cart-2', 'Item B', 200)
      ]
    });

    render(<CartPage />);

    await screen.findByText('Item A');

    expect(screen.getByText('2 items ready for checkout')).toBeInTheDocument();
  });
});
