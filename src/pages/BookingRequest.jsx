import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";
import { ArrowLeft, CalendarDays, MapPin, User, Loader2, CheckCircle } from "lucide-react";
import "./BookingRequest.css";

const AVAILABLE_SLOTS = [
  "Today 10:00",
  "Today 14:00",
  "Tomorrow 10:00",
  "Tomorrow 14:00",
  "Next Monday 10:00",
];

function parseSlotTime(slot) {
  const now = new Date();
  const date = new Date(now);
  const [, timePart] = slot.split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);

  if (slot.startsWith("Today")) {
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  if (slot.startsWith("Tomorrow")) {
    date.setDate(date.getDate() + 1);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  if (slot.startsWith("Next Monday")) {
    const currentDay = date.getDay();
    const daysUntilNextMonday = ((1 + 7 - currentDay) % 7) || 7;
    date.setDate(date.getDate() + daysUntilNextMonday);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  return date;
}

function BookingRequest() {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get("listing");
  const sellerId = searchParams.get("seller");
  const contextItem = searchParams.get("item") || "Listing";
  const contextName = searchParams.get("name") || "Seller";
  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [agreedPrice, setAgreedPrice] = useState(listing?.price || 0);
  const [selectedSlot, setSelectedSlot] = useState(AVAILABLE_SLOTS[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setError("Unable to load your session. Please refresh and try again.");
        setLoading(false);
        return;
      }

      setCurrentUserId(user?.id || null);

      if (!listingId) {
        setError("No listing selected for booking.");
        setLoading(false);
        return;
      }

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("id, title, price, listing_type, location, seller_id")
        .eq("id", listingId)
        .maybeSingle();

      if (listingError || !listingData) {
        setError("Unable to load the selected listing.");
        setLoading(false);
        return;
      }

      setListing(listingData);
      setAgreedPrice(listingData.price || 0);
      const activeSellerId = sellerId || listingData.seller_id;

      const { data: sellerData, error: sellerError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, campus")
        .eq("id", activeSellerId)
        .maybeSingle();

      if (sellerError || !sellerData) {
        setError("Unable to load seller profile.");
        setLoading(false);
        return;
      }

      setSeller(sellerData);
      setLoading(false);
    };

    fetchData();
  }, [listingId, sellerId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedSlot) {
      setError("Please select a drop-off slot.");
      return;
    }

    if (!listing || !seller || !currentUserId) {
      setError("Unable to submit booking. Missing listing or user details.");
      return;
    }

    if (currentUserId === seller.id) {
      setError("You cannot request a booking for your own listing.");
      return;
    }

    const slotTime = parseSlotTime(selectedSlot);
    if (!slotTime) {
      setError("Unable to resolve the selected slot time.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase.from("bookings").insert([
        {
          listing_id: listing.id,
          buyer_id: currentUserId,
          seller_id: seller.id,
          requested_slot: selectedSlot,
          slot_time: slotTime.toISOString(),
          status: "requested",
          agreed_price: agreedPrice,
          amount_paid: 0,
          cash_shortfall: agreedPrice,
          notes: note || null,
        },
      ]);

      if (insertError) throw insertError;

      const notificationText = `Booking request created for ${listing.title} at ${selectedSlot} with agreed price R${agreedPrice.toFixed(2)}.`;
      const { error: notificationError } = await supabase.from("messages").insert([
        {
          listing_id: listing.id,
          sender_id: currentUserId,
          receiver_id: seller.id,
          message_text: notificationText,
          is_read: false,
        },
      ]);

      if (notificationError) {
        console.error("Booking notification error:", notificationError);
      }

      setSuccess("Booking request submitted. The seller has been notified and facility staff can now confirm the slot.");
    } catch (err) {
      console.error("Booking insert error:", err);
      if (err && typeof err === "object" && "message" in err) {
        setError(err.message);
      } else {
        setError("Failed to request booking. Check the browser console for details.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => navigate(-1);
  const openMessages = () => {
    if (!seller || !listing) return;
    const query = new URLSearchParams({
      user: seller.id,
      listing: listing.id,
      name: seller.full_name,
      item: listing.title,
    }).toString();
    navigate(`/messages?${query}`);
  };

  return (
    <main className="booking-page">
      <nav className="booking-topnav">
        <button type="button" className="booking-back-btn" onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </button>
      </nav>

      <section className="booking-shell">
        <header className="booking-header">
          <div>
            <p className="booking-label">Trade facility booking</p>
            <h1>Book a drop-off slot for {contextItem || listing?.title}</h1>
            <p className="booking-description">
              Use the chat to agree the deal, then request a safe campus facility slot to complete the transaction.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="booking-loading">
            <Loader2 className="spinner" />
            <p>Loading booking details...</p>
          </div>
        ) : error ? (
          <div className="booking-status booking-error">{error}</div>
        ) : (
          <div className="booking-grid">
            <article className="booking-card">
              <header>
                <h2>Listing details</h2>
              </header>
              <div className="booking-meta">
                <p className="meta-label">Item</p>
                <p>{listing?.title || contextItem}</p>
              </div>
              <div className="booking-meta">
                <p className="meta-label">Type</p>
                <p>{listing?.listing_type || "Sale / Trade"}</p>
              </div>
              <div className="booking-meta">
                <p className="meta-label">Price</p>
                <p>{listing?.price ? `R ${listing.price}` : "Not priced"}</p>
              </div>
              <div className="booking-meta">
                <p className="meta-label">Facility</p>
                <p>{listing?.location || "Campus trade hub"}</p>
              </div>
            </article>

            <article className="booking-card booking-seller-card">
              <header>
                <h2>Seller</h2>
              </header>
              <div className="seller-profile">
                <div className="seller-avatar">
                  <User size={24} />
                </div>
                <div>
                  <p className="seller-name">{seller?.full_name || contextName}</p>
                  <p className="seller-campus"><MapPin size={12} /> {seller?.campus || "Unknown campus"}</p>
                </div>
              </div>
            </article>

            <article className="booking-card booking-action-card">
              <header>
                <h2>Request a slot</h2>
              </header>
              <form onSubmit={handleSubmit} className="booking-form">
                <label className="field-label" htmlFor="agreed-price">Agreed price (R)</label>
                <input
                  id="agreed-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Enter the negotiated price"
                />

                <label className="field-label" htmlFor="slot-select">Choose a drop-off slot</label>
                <select
                  id="slot-select"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                >
                  {AVAILABLE_SLOTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <label className="field-label" htmlFor="booking-note">Notes for seller / staff</label>
                <textarea
                  id="booking-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add any details you want the seller or facility staff to see..."
                />

                <button type="submit" className="booking-submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Request booking"}
                </button>

                {success ? (
                  <div className="booking-status booking-success">
                    <CheckCircle size={18} /> {success}
                  </div>
                ) : null}
                {error ? <div className="booking-status booking-error">{error}</div> : null}
              </form>
            </article>
          </div>
        )}

        <footer className="booking-footer">
          <button type="button" onClick={openMessages} className="booking-secondary">
            Open related chat
          </button>
        </footer>
      </section>
    </main>
  );
}

export default BookingRequest;
