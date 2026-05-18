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
      .select("id, listing_id, payment_status, cash_shortfall")
      .eq("buyer_id", id)
      .eq("buyer_notified", false)
      .eq("status", "ready_for_collection");

    if (!error && data.length > 0) {
      setPendingBookings(data);
      setVisible(true);
    }
  };

  const handleDismiss = async () => {
    const ids = pendingBookings.map((b) => b.id);

    await supabase
      .from("bookings")
      .update({ buyer_notified: true })
      .in("id", ids);

    setVisible(false);
  };

  if (!visible) return null;

  const fullyPaid = pendingBookings.every(
    (b) => b.payment_status === "FULLY_PAID"
  );

  return (
    <aside className="popup-overlay">
      <article className="popup-card">

        <header className="popup-header">
          <span className="popup-icon">
            {fullyPaid ? "📦" : "⚠️"}
          </span>
          <h2 className="popup-title">
            {fullyPaid
              ? "Item Ready for Collection"
              : "Outstanding Payment Required"}
          </h2>
        </header>

        <p className="popup-body">
          {fullyPaid
            ? "Your item is ready for collection at the trade facility. Please visit during operating hours to collect it."
            : "Your item has been received at the trade facility, but you have an outstanding balance. Please settle your payment before collection."}
        </p>

        <ul className="popup-list">
          {pendingBookings.map((booking) => (
            <li key={booking.id} className="popup-list-item">
              Booking #{booking.id.slice(0, 6)}
              {!fullyPaid && booking.cash_shortfall > 0 && (
                <span className="popup-shortfall">
                  {" "}— R{parseFloat(booking.cash_shortfall).toFixed(2)} outstanding
                </span>
              )}
            </li>
          ))}
        </ul>

        {!fullyPaid && (
          <p className="popup-sub warning">
            ⚠️ You will not be able to collect your item until full payment is received.
          </p>
        )}

        {fullyPaid && (
          <p className="popup-sub">
            Please bring your student card when collecting.
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