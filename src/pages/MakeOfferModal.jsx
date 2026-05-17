import React, { useEffect, useState } from 'react';
import { X, Banknote, Package } from 'lucide-react';

const MakeOfferModal = ({ type, listing, visible, onClose, onSubmit, loading, error }) => {
  const [amount, setAmount] = useState(listing?.price || 0);
  const [tradeItem, setTradeItem] = useState('');
  const [cashAmount, setCashAmount] = useState(0);

  useEffect(() => {
    setAmount(listing?.price || 0);
    setTradeItem('');
    setCashAmount(0);
  }, [listing, type]);

  if (!visible || !listing) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ amount, cashAmount, tradeItem });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <header className="modal-header">
          <div>
            <h2>{type === 'offer' ? 'Make an Offer' : 'Request a Trade'}</h2>
            <p>
              {type === 'offer'
                ? `Propose a rand price for ${listing.title}.`
                : `Tell the seller exactly what you want to swap for ${listing.title}, plus any rand top-up.`}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close offer dialog">
            <X size={20} />
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          {type === 'offer' ? (
            <fieldset className="modal-fieldset">
              <label htmlFor="offer-amount">Offer Amount (R)</label>
              <div className="modal-input-row">
                <Banknote size={16} />
                <input
                  id="offer-amount"
                  aria-label="Offer Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  required
                  onChange={(event) => setAmount(Number(event.target.value))}
                />
              </div>
            </fieldset>
          ) : (
            <>
              <fieldset className="modal-fieldset">
                <label htmlFor="trade-item">Item You Are Offering</label>
                <div className="modal-input-row">
                  <Package size={16} />
                  <input
                    id="trade-item"
                    type="text"
                    value={tradeItem}
                    placeholder="Example: Scientific calculator, Casio fx-991ZA"
                    required
                    onChange={(event) => setTradeItem(event.target.value)}
                  />
                </div>
              </fieldset>
              <fieldset className="modal-fieldset">
                <label htmlFor="cash-supplement">Rand Top-Up (optional)</label>
                <div className="modal-input-row">
                  <Banknote size={16} />
                  <input
                    id="cash-supplement"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashAmount}
                    onChange={(event) => setCashAmount(Number(event.target.value))}
                  />
                </div>
              </fieldset>
            </>
          )}

          {error && <p className="modal-error">{error}</p>}

          <footer className="modal-footer">
            <button type="button" className="modal-secondary-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="modal-primary-btn" disabled={loading}>
              {loading ? 'Submitting…' : type === 'offer' ? 'Send Offer' : 'Send Trade Request'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default MakeOfferModal;
