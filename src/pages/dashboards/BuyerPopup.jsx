import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import "./BuyerPopup.css";

export default function BuyerPopup({ userId }) {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (userId) checkForDropoffs(userId);
  }, [userId]);

  const checkForDropoffs = async (id) => {
    console.log("Checking dropoffs for buyer:", id);

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        listing_id,
        listings ( title ),
        seller:profiles!bookings_seller_id_fkey ( full_name )
      `)
      .eq("buyer_id", id)
      .eq("item_received", true)
      .eq("buyer_notified", false);

    console.log("Result:", data, "Error:", error);

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

  return (
    <aside className="popup-overlay">
      <article className="popup-card">

        <header className="popup-header">
          <span className="popup-icon">📦</span>
          <h2 className="popup-title">Item Dropped Off</h2>
        </header>

        <p className="popup-body">
          The following{" "}
          {pendingBookings.length === 1 ? "item" : "items"}{" "}
          have been dropped off at the trade facility:
        </p>

        <ul className="popup-list">
          {pendingBookings.map((booking) => (
            <li key={booking.id} className="popup-list-item">
              {booking.seller?.full_name || "The seller"} dropped off {booking.listings?.title || `booking #${booking.id.slice(0, 6)}`}
            </li>
          ))}
        </ul>

        <p className="popup-sub">
           Your item is ready for collection.
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
