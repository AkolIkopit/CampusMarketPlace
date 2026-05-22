/*
Module: BookingRequest.jsx
Purpose: Booking creation UI for scheduled pickups/dropoffs at trade facility.
Units: date/time selection, validation, submission to booking backend
Flow: Collects booking details and inserts booking record; used in transaction workflows.
*/
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";
import { ArrowLeft, MapPin, User, Loader2, CheckCircle } from "lucide-react";
import "./BookingRequest.css";

const SLOT_INTERVAL_MINUTES = 30;
const EARLIEST_BOOKING_HOUR = 8;
const LATEST_BOOKING_HOUR = 17;
const SYSTEM_MESSAGE_PREFIX = "[SYSTEM] ";

function formatSlotLabel(date) {
  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRealisticBookingTime(date) {
  const hour = date.getHours();
  return hour >= EARLIEST_BOOKING_HOUR && hour < LATEST_BOOKING_HOUR;
}

function buildBookableSlots(tradeSlots = []) {
  const now = new Date();

  return tradeSlots.flatMap((slot) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    const hasCapacity = Number(slot.max_capacity || 0) > Number(slot.current_bookings || 0);

    if (!hasCapacity || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= now) {
      return [];
    }

    const options = [];
    const cursor = new Date(Math.max(start.getTime(), now.getTime()));
    cursor.setSeconds(0, 0);

    const remainder = cursor.getMinutes() % SLOT_INTERVAL_MINUTES;
    if (remainder !== 0) {
      cursor.setMinutes(cursor.getMinutes() + (SLOT_INTERVAL_MINUTES - remainder));
    }

    while (cursor < end) {
      if (isRealisticBookingTime(cursor)) {
        options.push({
          id: `${slot.id}__${cursor.toISOString()}`,
          tradeSlotId: slot.id,
          date: new Date(cursor),
          label: formatSlotLabel(cursor),
          capacity: Number(slot.max_capacity || 0),
          booked: Number(slot.current_bookings || 0),
        });
      }
      cursor.setMinutes(cursor.getMinutes() + SLOT_INTERVAL_MINUTES);
    }

    return options;
  });
}

async function getProfileName(userId, fallback = "A student") {
  if (!userId) return fallback;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name || fallback;
}

function BookingRequest() {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get("listing");
  const sellerId = searchParams.get("seller");
  const buyerParam = searchParams.get("buyer");
  const transactionId = searchParams.get("transaction");
  const bookingId = searchParams.get("booking");
  const bookingMode = searchParams.get("mode") === "collection" ? "collection" : "dropoff";
  const contextItem = searchParams.get("item") || "Listing";
  const contextName = searchParams.get("name") || "Seller";
  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [agreedPrice, setAgreedPrice] = useState(listing?.price || 0);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
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

      if (bookingMode === "collection" && !bookingId) {
        setError("No booking selected for collection.");
        setLoading(false);
        return;
      }

      let activeListingId = listingId;
      let activeSellerId = sellerId;

      if (bookingMode === "collection") {
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("id, transaction_id, listing_id, buyer_id, seller_id, status, agreed_price, collection_time, item_received, item_released, cash_shortfall")
          .eq("id", bookingId)
          .maybeSingle();

        if (bookingError || !bookingData) {
          setError("Unable to load the selected collection booking.");
          setLoading(false);
          return;
        }

        if (bookingData.buyer_id !== user?.id) {
          setError("Only the buyer can book a collection slot.");
          setLoading(false);
          return;
        }

        const collectionReady = bookingData.status === "ready_for_collection" || bookingData.status === "item_received" || bookingData.item_received;

        if (!collectionReady || bookingData.item_released) {
          setError("This order is not ready for collection.");
          setLoading(false);
          return;
        }

        if (bookingData.transaction_id) {
          const { data: transactionData, error: transactionError } = await supabase
            .from("transactions")
            .select("cash_shortfall_due, payment_status")
            .eq("id", bookingData.transaction_id)
            .maybeSingle();

          if (transactionError) {
            setError("Unable to verify payment status before collection.");
            setLoading(false);
            return;
          }

          const transactionShortfall = Number(transactionData?.cash_shortfall_due || 0);
          const bookingShortfall = Number(bookingData.cash_shortfall || 0);
          const paymentComplete = String(transactionData?.payment_status || "").toLowerCase() === "fully_paid";

          if (!paymentComplete || transactionShortfall > 0 || bookingShortfall > 0) {
            setError("Payment must be completed before booking a collection slot.");
            setLoading(false);
            return;
          }
        }

        setExistingBooking(bookingData);
        activeListingId = bookingData.listing_id;
        activeSellerId = bookingData.seller_id;
        setAgreedPrice(bookingData.agreed_price || 0);
      }

      if (!activeListingId) {
        setError("No listing selected for booking.");
        setLoading(false);
        return;
      }

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("id, title, price, listing_type, location, seller_id")
        .eq("id", activeListingId)
        .maybeSingle();

      if (listingError || !listingData) {
        setError("Unable to load the selected listing.");
        setLoading(false);
        return;
      }

      setListing(listingData);
      if (bookingMode !== "collection") {
        setAgreedPrice(listingData.price || 0);
      }
      activeSellerId = activeSellerId || listingData.seller_id;

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

          // Removed unused activeBuyerId variable
      setSeller(sellerData);

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data: slotRows, error: slotError } = await supabase
        .from("trade_slots")
        .select("id, campus_name, start_time, end_time, max_capacity, current_bookings, is_active")
        .eq("campus_name", listingData.location || sellerData.campus || "Main Campus")
        .eq("is_active", true)
        .gte("end_time", new Date().toISOString())
        .lte("start_time", sevenDaysFromNow.toISOString())
        .order("start_time", { ascending: true });

      if (slotError) {
        setError("Unable to load available staff-backed facility slots.");
        setLoading(false);
        return;
      }

      const bookableSlots = buildBookableSlots(slotRows || []);
      setAvailableSlots(bookableSlots);
      setSelectedSlotId(bookableSlots[0]?.id || "");
      setLoading(false);
    };

    fetchData();
  }, [listingId, sellerId, buyerParam, bookingId, bookingMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId);

    if (!selectedSlot) {
      setError(`Please select a ${bookingMode === "collection" ? "collection" : "drop-off"} slot.`);
      return;
    }

    if (!listing || !seller || !currentUserId) {
      setError("Unable to submit booking. Missing listing or user details.");
      return;
    }

    if (bookingMode === "collection") {
      if (!existingBooking) {
        setError("Unable to submit collection slot. Missing booking details.");
        return;
      }

      if (existingBooking.buyer_id !== currentUserId) {
        setError("Only the buyer can book a collection slot.");
        return;
      }

      if (existingBooking.transaction_id) {
        const { data: transactionData, error: transactionError } = await supabase
          .from("transactions")
          .select("cash_shortfall_due, payment_status")
          .eq("id", existingBooking.transaction_id)
          .maybeSingle();

        if (transactionError) {
          setError("Unable to verify payment status before collection.");
          return;
        }

        const transactionShortfall = Number(transactionData?.cash_shortfall_due || 0);
        const bookingShortfall = Number(existingBooking.cash_shortfall || 0);
        const paymentComplete = String(transactionData?.payment_status || "").toLowerCase() === "fully_paid";

        if (!paymentComplete || transactionShortfall > 0 || bookingShortfall > 0) {
          setError("Payment must be completed before booking a collection slot.");
          return;
        }
      }

      const collectionTime = selectedSlot.date;
      if (!collectionTime) {
        setError("Unable to resolve the selected collection slot time.");
        return;
      }

      setSubmitting(true);

      try {
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            collection_time: collectionTime.toISOString(),
            buyer_notified: true,
          })
          .eq("id", existingBooking.id);

        if (updateError) throw updateError;

        const { data: freshCollectionSlot } = await supabase
          .from("trade_slots")
          .select("current_bookings")
          .eq("id", selectedSlot.tradeSlotId)
          .maybeSingle();

        const { error: collectionSlotUpdateError } = await supabase
          .from("trade_slots")
          .update({ current_bookings: (freshCollectionSlot?.current_bookings || 0) + 1 })
          .eq("id", selectedSlot.tradeSlotId);

        if (collectionSlotUpdateError) {
          console.error("Failed to update slot count:", collectionSlotUpdateError);
        }

        const buyerName = await getProfileName(currentUserId, "The buyer");
        const notificationText = `${SYSTEM_MESSAGE_PREFIX}${buyerName} booked a collection slot for ${listing.title} at ${selectedSlot.label}.`;
        const { error: notificationError } = await supabase.from("messages").insert([
          {
            listing_id: listing.id,
            sender_id: currentUserId,
            receiver_id: seller.id,
            message_text: notificationText,
            transaction_id: transactionId || existingBooking.transaction_id || null,
            is_read: false,
          },
        ]);

        if (notificationError) {
          console.error("Collection notification error:", notificationError);
        }

        setExistingBooking({ ...existingBooking, collection_time: collectionTime.toISOString() });
        setSuccess("Collection slot booked. The seller and facility staff can now see the selected collection time.");
      } catch (err) {
        console.error("Collection booking update error:", err);
        if (err && typeof err === "object" && "message" in err) {
          setError(err.message);
        } else {
          setError("Failed to book collection slot. Check the browser console for details.");
        }
      } finally {
        setSubmitting(false);
      }

      return;
    }

    // Determine booking buyer (either param or current viewer).
    const bookingBuyerId = buyerParam || currentUserId;

    if (!bookingBuyerId || bookingBuyerId === seller.id) {
      setError("You cannot request a booking for your own listing.");
      return;
    }

    const slotTime = selectedSlot.date;
    if (!slotTime) {
      setError("Unable to resolve the selected slot time.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase.from("bookings").insert([
        {
          transaction_id: transactionId || null,
          listing_id: listing.id,
          buyer_id: bookingBuyerId,
          seller_id: seller.id,
          requested_slot: selectedSlot.label,
          slot_time: slotTime.toISOString(),
          status: "requested",
          agreed_price: agreedPrice,
          amount_paid: 0,
          cash_shortfall: agreedPrice,
          notes: note || null,
        },
      ]);

      if (insertError) throw insertError;

      const { data: freshDropoffSlot } = await supabase
        .from("trade_slots")
        .select("current_bookings")
        .eq("id", selectedSlot.tradeSlotId)
        .maybeSingle();

      const { error: dropoffSlotUpdateError } = await supabase
        .from("trade_slots")
        .update({ current_bookings: (freshDropoffSlot?.current_bookings || 0) + 1 })
        .eq("id", selectedSlot.tradeSlotId);

      if (dropoffSlotUpdateError) {
        console.error("Failed to update slot count:", dropoffSlotUpdateError);
      }

      if (transactionId) {
        await supabase
          .from("transactions")
          .update({
            booking_status: "requested",
            payment_status: "pending",
            agreed_amount: agreedPrice,
            cash_shortfall_due: Math.max(agreedPrice, 0),
          })
          .eq("id", transactionId);
      }

      // Notify the counterparty: seller if buyer initiated, buyer if seller initiated.
      const notificationReceiver = currentUserId === seller.id ? bookingBuyerId : seller.id;
      const requesterName = await getProfileName(currentUserId, "A student");
      const counterpartyName = await getProfileName(notificationReceiver, "the other student");
      const notificationText = `${SYSTEM_MESSAGE_PREFIX}${requesterName} requested a trade facility booking with ${counterpartyName} for ${listing.title} at ${selectedSlot.label} with agreed price R${agreedPrice.toFixed(2)}.`;
      const { error: notificationError } = await supabase.from("messages").insert([
        {
          listing_id: listing.id,
          sender_id: currentUserId,
          receiver_id: notificationReceiver,
          message_text: notificationText,
          transaction_id: transactionId || null,
          is_read: false,
        },
      ]);

      if (notificationError) {
        console.error("Booking notification error:", notificationError);
      }

      setSuccess("Booking request submitted. The other party has been notified and facility staff can now confirm the slot.");
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
            <h1>
              {bookingMode === "collection" ? "Book a collection slot" : "Book a drop-off slot"} for {contextItem || listing?.title}
            </h1>
            <p className="booking-description">
              {bookingMode === "collection"
                ? "Choose when you will collect the item from the campus trade facility."
                : "Use the chat to agree the deal, then request a safe campus facility slot to complete the transaction."}
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
                <h2>{bookingMode === "collection" ? "Collection slot" : "Request a slot"}</h2>
              </header>
              <form onSubmit={handleSubmit} className="booking-form">
                {bookingMode === "dropoff" ? (
                  <>
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
                  </>
                ) : (
                  <div className="booking-status booking-info">
                    This item has been dropped off and is ready for buyer collection.
                  </div>
                )}

                <label className="field-label" htmlFor="slot-select">
                  Choose a {bookingMode === "collection" ? "collection" : "drop-off"} slot
                </label>
                <select
                  id="slot-select"
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  disabled={availableSlots.length === 0}
                >
                  {availableSlots.length === 0 ? (
                    <option value="">
                      No staff-backed slots available
                    </option>
                  ) : availableSlots.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {availableSlots.length === 0 ? (
                  <div className="booking-status booking-info">
                    No facility staff are currently scheduled for realistic booking hours at this campus.
                    Please ask an admin to add staff-backed facility slots.
                  </div>
                ) : null}

                {bookingMode === "dropoff" ? (
                  <>
                    <label className="field-label" htmlFor="booking-note">Notes for seller / staff</label>
                    <textarea
                      id="booking-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add any details you want the seller or facility staff to see..."
                    />
                  </>
                ) : null}

                <button type="submit" className="booking-submit" disabled={submitting}>
                  {submitting
                    ? "Submitting..."
                    : bookingMode === "collection"
                      ? "Book collection slot"
                      : "Request booking"}
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
