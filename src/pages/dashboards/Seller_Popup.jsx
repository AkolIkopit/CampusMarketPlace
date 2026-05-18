import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import "./Seller_Popup.css";

export default function SellerPopup({ userId }) {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (userId) checkForCompletion(userId);
  }, [userId]);

  const checkForCompletion = async (id) => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        listing_id,
        listings ( title ),
        buyer:profiles!bookings_buyer_id_fkey ( full_name )
      `)
      .eq("seller_id", id)
      .eq("seller_notified", false)
      .eq("status", "completed");

    if (!error && data.length > 0) {
      setPendingBookings(data);
      setVisible(true);
    }
  };

  const handleDismiss = async () => {
    const ids = pendingBookings.map((b) => b.id);

    await supabase
      .from("bookings")
      .update({ seller_notified: true })
      .in("id", ids);

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="popup-overlay">
      <article className="popup-card">

        <header className="popup-header">
          <span className="popup-icon">🎉</span>
          <h2 className="popup-title">Trade Completed</h2>
        </header>

        <p className="popup-body">
          The following{" "}
          {pendingBookings.length === 1 ? "trade has" : "trades have"}{" "}
          been completed at the trade facility:
        </p>

        <ul className="popup-list">
          {pendingBookings.map((booking) => (
            <li key={booking.id} className="popup-list-item">
              {booking.buyer?.full_name || "The buyer"} collected {booking.listings?.title || `booking #${booking.id.slice(0, 6)}`}.
            </li>
          ))}
        </ul>

        <p className="popup-sub">
          Thank you for trading on UniMart.
        </p>

        <footer className="popup-footer">
          <button className="btn btn-primary" onClick={handleDismiss}>
            Got it
          </button>
        </footer>

      </article>
    </aside>
  );
}
