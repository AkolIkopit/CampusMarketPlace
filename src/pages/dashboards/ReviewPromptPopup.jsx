import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import "./BuyerPopup.css"; // reuse the shared popup styles

const DISMISSED_KEY = "campus_review_dismissed_bookings";

function getDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids) {
  try {
    const merged = [...new Set([...getDismissed(), ...ids])];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }
}

export default function ReviewPromptPopup({ userId }) {
  const [pending, setPending] = useState([]);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) fetchUnreviewedTrades(userId);
  }, [userId]);

  const fetchUnreviewedTrades = async (id) => {
    // 1. Fetch all completed trades where this user was the buyer
    const { data: completedBookings, error } = await supabase
      .from("bookings")
      .select("id, listing_id, listings(title)")
      .eq("buyer_id", id)
      .eq("status", "completed")
      .eq("item_released", true);

    if (error || !completedBookings?.length) return;

    // 2. Remove bookings the user already dismissed this session
    const dismissed = getDismissed();
    const candidates = completedBookings.filter((b) => !dismissed.includes(b.id));
    if (!candidates.length) return;

    // 3. Remove listings the user already reviewed
    const listingIds = candidates.map((b) => b.listing_id);
    const { data: existingReviews } = await supabase
      .from("reviews")
      .select("listing_id")
      .eq("reviewer_id", id)
      .in("listing_id", listingIds);

    const reviewed = new Set((existingReviews || []).map((r) => r.listing_id));
    const unreviewed = candidates.filter((b) => !reviewed.has(b.listing_id));

    if (unreviewed.length > 0) {
      setPending(unreviewed);
      setVisible(true);
    }
  };

  const handleLeaveReview = (booking) => {
    setVisible(false);
    navigate(`/listing/${booking.listing_id}?review=true`);
  };

  const handleDismiss = () => {
    saveDismissed(pending.map((b) => b.id));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="popup-overlay">
      <article className="popup-card">
        <header className="popup-header">
          <span className="popup-icon">⭐</span>
          <h2 className="popup-title">How did it go?</h2>
        </header>

        <p className="popup-body">
          {pending.length === 1
            ? "Your trade is complete! Leave a review to help other students."
            : `You have ${pending.length} completed trades. Leave a review to help other students.`}
        </p>

        <ul className="popup-list">
          {pending.map((booking) => (
            <li
              key={booking.id}
              className="popup-list-item"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
            >
              <span style={{ flex: 1 }}>
                {booking.listings?.title || `Order #${booking.id.slice(0, 6)}`}
              </span>
              <button
                className="btn btn-primary"
                style={{ padding: "6px 16px", fontSize: "13px", whiteSpace: "nowrap" }}
                onClick={() => handleLeaveReview(booking)}
              >
                Leave a Review
              </button>
            </li>
          ))}
        </ul>

        <footer className="popup-footer">
          <button
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: "13px",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            Maybe Later
          </button>
        </footer>
      </article>
    </aside>
  );
}
