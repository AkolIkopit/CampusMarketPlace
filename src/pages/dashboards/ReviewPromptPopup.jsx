/*
Module: ReviewPromptPopup.jsx
Purpose: Small popup component to prompt buyers to leave a review after a transaction.
Units: prompt content, call-to-action to navigate to listing or open review UI
Flow: Triggered after a completed booking to encourage feedback; navigates to listing with query param.
*/
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
      .select("id, listing_id, created_at, listings(title)")
      .eq("buyer_id", id)
      .eq("status", "completed")
      .eq("item_released", true);

    if (error || !completedBookings?.length) return;

    // 2. Remove bookings the user already dismissed this session
    const dismissed = getDismissed();
    const candidates = completedBookings.filter((b) => !dismissed.includes(b.id));
    if (!candidates.length) return;

    // 3. Remove listings the user has already reviewed for the latest completed booking.
    const listingIds = candidates.map((b) => b.listing_id);
    const { data: existingReviews } = await supabase
      .from("reviews")
      .select("listing_id, created_at")
      .eq("reviewer_id", id)
      .in("listing_id", listingIds);

    const latestReviewByListing = (existingReviews || []).reduce((acc, review) => {
      if (!review.created_at) return acc;
      const reviewDate = new Date(review.created_at);
      const current = acc[review.listing_id];
      if (!current || reviewDate > current) {
        acc[review.listing_id] = reviewDate;
      }
      return acc;
    }, {});

    const unreviewed = candidates.filter((booking) => {
      const bookingDate = booking.created_at ? new Date(booking.created_at) : null;
      const latestReviewDate = latestReviewByListing[booking.listing_id];
      return !bookingDate || !latestReviewDate || bookingDate > latestReviewDate;
    });

    const latestUnreviewedByListing = Object.values(
      unreviewed.reduce((acc, booking) => {
        const current = acc[booking.listing_id];
        const bookingDate = booking.created_at ? new Date(booking.created_at) : new Date(0);
        const currentDate = current?.created_at ? new Date(current.created_at) : new Date(0);
        if (!current || bookingDate > currentDate) {
          acc[booking.listing_id] = booking;
        }
        return acc;
      }, {})
    );

    if (latestUnreviewedByListing.length > 0) {
      setPending(latestUnreviewedByListing);
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
