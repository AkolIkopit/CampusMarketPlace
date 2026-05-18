import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import "./BuyerPopup.css";

export default function BuyerPopup({ userId }) {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (userId) checkForNotifications(userId);
  }, [userId]);

  const checkForNotifications = async (id) => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        listing_id,
        transaction_id,
        payment_status,
        cash_shortfall,
        listings ( title ),
        transactions ( payment_status, cash_shortfall_due )
      `)
      .eq("buyer_id", id)
      .eq("buyer_notified", false)
      .eq("status", "ready_for_collection");

    if (!error && data?.length > 0) {
      setPendingBookings(data);
      setVisible(true);
    }
  };

  const handleDismiss = async () => {
    const ids = pendingBookings.map((booking) => booking.id);

    await supabase
      .from("bookings")
      .update({ buyer_notified: true })
      .in("id", ids);

    setVisible(false);
  };

  if (!visible) return null;

  const isBookingFullyPaid = (booking) => {
    const paymentStatus = String(
      booking.transactions?.payment_status || booking.payment_status || ""
    ).toLowerCase();
    const transactionShortfall = Number(booking.transactions?.cash_shortfall_due || 0);
    const bookingShortfall = Number(booking.cash_shortfall || 0);

    return paymentStatus === "fully_paid" && transactionShortfall <= 0 && bookingShortfall <= 0;
  };

  const getOutstandingAmount = (booking) => {
    const transactionShortfall = Number(booking.transactions?.cash_shortfall_due || 0);
    const bookingShortfall = Number(booking.cash_shortfall || 0);
    return Math.max(transactionShortfall, bookingShortfall, 0);
  };

  const hasOutstandingPayment = pendingBookings.some((booking) => !isBookingFullyPaid(booking));

  return (
    <aside className="popup-overlay">
      <article className="popup-card">
        <header className="popup-header">
          <span className="popup-icon">
            {hasOutstandingPayment ? "!" : "OK"}
          </span>
          <h2 className="popup-title">
            {hasOutstandingPayment ? "Outstanding Payment Required" : "Item Dropped Off"}
          </h2>
        </header>

        <p className="popup-body">
          {hasOutstandingPayment
            ? "Your item has been received at the trade facility, but you have an outstanding balance. Please settle your payment before collection."
            : "Your item has been dropped off at the trade facility. Book a collection slot from Profile > My Orders to collect your item."}
        </p>

        <ul className="popup-list">
          {pendingBookings.map((booking) => {
            const outstandingAmount = getOutstandingAmount(booking);

            return (
              <li key={booking.id} className="popup-list-item">
                {booking.listings?.title || `Booking #${booking.id.slice(0, 6)}`}
                {!isBookingFullyPaid(booking) && outstandingAmount > 0 ? (
                  <span className="popup-shortfall">
                    {" "}-- R{outstandingAmount.toFixed(2)} outstanding
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>

        {hasOutstandingPayment ? (
          <p className="popup-sub warning">
            You will not be able to collect your item until full payment is received.
          </p>
        ) : (
          <p className="popup-sub">
            Collection booking is now available under Profile &gt; My Orders.
          </p>
        )}

        <footer className="popup-footer">
          <button className="btn btn-primary" onClick={handleDismiss}>
            Got it
          </button>
        </footer>
      </article>
    </aside>
  );
}
