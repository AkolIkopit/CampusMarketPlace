import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MakeOfferModal from './MakeOfferModal';

const listing = {
  id: 'listing-1',
  title: 'Graphing Calculator',
  price: 450
};

describe('MakeOfferModal', () => {
  it('does not render when hidden', () => {
    render(
      <MakeOfferModal
        type="offer"
        listing={listing}
        visible={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits an offer amount', async () => {
    const onSubmit = jest.fn();

    render(
      <MakeOfferModal
        type="offer"
        listing={listing}
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    const amountInput = screen.getByLabelText('Offer Amount');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '375');
    fireEvent.click(screen.getByText('Send Offer'));

    expect(onSubmit).toHaveBeenCalledWith({
      amount: 375,
      cashAmount: 0,
      tradeItem: ''
    });
  });

  it('submits a trade item with optional cash top-up', async () => {
    const onSubmit = jest.fn();

    render(
      <MakeOfferModal
        type="trade"
        listing={listing}
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    await userEvent.type(screen.getByLabelText('Your Trade Item'), 'Scientific calculator');
    await userEvent.clear(screen.getByLabelText('Rand Top-Up (optional)'));
    await userEvent.type(screen.getByLabelText('Rand Top-Up (optional)'), '50');
    fireEvent.click(screen.getByText('Send Trade Request'));

    expect(onSubmit).toHaveBeenCalledWith({
      amount: 450,
      cashAmount: 50,
      tradeItem: 'Scientific calculator'
    });
  });

  it('closes from the close and cancel controls and displays errors/loading state', async () => {
    const onClose = jest.fn();

    render(
      <MakeOfferModal
        type="offer"
        listing={listing}
        visible
        onClose={onClose}
        onSubmit={jest.fn()}
        loading
        error="Offer failed"
      />
    );

    expect(screen.getByText('Offer failed')).toBeInTheDocument();
    expect(screen.getByText(/Submitting/).closest('button')).toBeDisabled();
    expect(screen.getByText('Cancel').closest('button')).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Close offer dialog'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});