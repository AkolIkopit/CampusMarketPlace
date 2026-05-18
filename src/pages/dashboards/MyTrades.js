import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import "./MyTrades.css";

export default function MyTrades() {
  const [trades, setTrades] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (!user) return;
    fetchTrades(user.id);
  };

  const fetchTrades = async (userId) => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        listings (
          title,
          listing_type,
          trade_item,
          listing_images ( image_url, is_primary )
        ),
        buyer:profiles!bookings_buyer_id_fkey ( full_name ),
        seller:profiles!bookings_seller_id_fkey ( full_name )
      `)
      .eq("staff_id", userId)
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) console.error(error.message);
    else setTrades(data || []);
  };

  const updateField = async (tradeId, updates) => {

    // MUST be before supabase call so flags are included in the update
    if (updates.item_received === true) {
      updates.buyer_notified = false;
    }

    if (updates.status === "completed") {
      updates.seller_completion_notified = false;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", tradeId);

    if (error) console.error(error.message);
    else fetchTrades(currentUser.id);
  };

  const formatSlotTime = (slotTime) => {
    if (!slotTime) return "Not scheduled";
    return new Date(slotTime).toLocaleString();
  };

  return (
    <main className="dashboard-container">

      <section className="hero-section">
        <span className="hero-kicker">MY WORK</span>
        <h1 className="hero-title">Sales & Trades</h1>
        <p className="hero-description">
          Confirm drop-offs, payments, collections, and complete transactions.
        </p>
      </section>

      <section className="trades-list">

        {trades.length === 0 && (
          <p className="empty-msg">No assigned trades.</p>
        )}

        {trades.map((trade) => (
          <article key={trade.id} className="trade-card">

            {/* HEADER */}
            <header className="trade-card-header">
              <section className="trade-header-left">
                <span className="trade-id">#{trade.id.slice(0, 6)}</span>
                <span className="trade-type-pill">
                  {trade.listings?.listing_type === "trade" ? "🔄 Trade" : "🛒 Sale"}
                </span>
              </section>
              <span className={`status-pill status-${trade.status}`}>
                {trade.status.replace(/_/g, " ")}
              </span>
            </header>

            {/* LISTING PREVIEW */}
            <section className="trade-listing-preview">
              <img
                src={
                  trade.listings?.listing_images?.find((i) => i.is_primary)?.image_url ||
                  trade.listings?.listing_images?.[0]?.image_url ||
                  "/placeholder.jpg"
                }
                alt={trade.listings?.title}
                className="trade-listing-img"
              />
              <section className="trade-listing-info">
                <h3 className="trade-listing-title">
                  {trade.listings?.title || "Unknown Listing"}
                </h3>
                {trade.listings?.listing_type === "trade" && trade.listings?.trade_item && (
                  <p className="trade-item-label">
                    Trading for: <strong>{trade.listings.trade_item}</strong>
                  </p>
                )}
                <p className="trade-parties">
                  <span>🧑 Seller: {trade.seller?.full_name || "—"}</span>
                  <span>🧑 Buyer: {trade.buyer?.full_name || "—"}</span>
                </p>
              </section>
            </section>

            {/* PRICE INFO */}
            <ul className="info-grid">
              <li className="info-item">
                <span className="info-label">Agreed Price</span>
                <span className="info-value">R {trade.agreed_price ?? "—"}</span>
              </li>
              <li className="info-item">
                <span className="info-label">Amount Paid</span>
                <span className="info-value">R {trade.amount_paid ?? "—"}</span>
              </li>
              <li className="info-item">
                <span className="info-label">Outstanding</span>
                <span className="info-value outstanding">
                  R {trade.cash_shortfall ?? "0"}
                </span>
              </li>
              <li className="info-item">
                <span className="info-label">Notes</span>
                <span className="info-value small">{trade.notes || "—"}</span>
              </li>
            </ul>

            {/* SCHEDULE */}
            <ul className="schedule-row">
              <li className="sched-item">
                🕐 Drop-off:{" "}
                {formatSlotTime(trade.dropoff_time || trade.slot_time)}
              </li>
              <li className="sched-item">
                📅 Collection:{" "}
                {formatSlotTime(trade.collection_time)}
              </li>
            </ul>

           
          {/* STATUS BADGES */}
<ul className="checks-row">
  <li className={`check-badge ${trade.item_received ? "yes" : "no"}`}>
    {trade.item_received ? "✅" : "❌"} Item received
  </li>
  <li className={`check-badge ${trade.cash_shortfall <= 0 ? "yes" : "no"}`}>
    {trade.cash_shortfall <= 0 ? "✅" : "❌"} Payment settled
  </li>
  <li className={`check-badge ${trade.item_released ? "yes" : "no"}`}>
    {trade.item_released ? "✅" : "❌"} Item released
  </li>
</ul>
            {/* ACTIONS */}
           <footer className="actions-row">

  {/* STEP 1 */}
  {!trade.item_received && (
    <button
      className="btn btn-primary"
      onClick={() =>
        updateField(trade.id, {
          item_received: true,
          status: "item_received",
        })
      }
    >
      Confirm Item Receipt
    </button>
  )}

  {/* STEP 2 */}
  {trade.item_received && trade.status === "item_received" && (
    <button
      className="btn btn-primary"
      onClick={() =>
        updateField(trade.id, {
          status: "ready_for_collection",
        })
      }
    >
      Mark Ready for Collection
    </button>
  )}

  {/* STEP 3 — payment shortfall warning, no action needed from staff */}
  {trade.status === "ready_for_collection" && trade.cash_shortfall > 0 && (
    <p className="cash-warning">
      ⚠️ Payment shortfall of R{trade.cash_shortfall} — buyer must settle online before item can be released
    </p>
  )}

  {/* STEP 3 — complete, disabled until shortfall is 0 */}
  {trade.status === "ready_for_collection" && (
    <button
      className="btn btn-danger"
      disabled={trade.cash_shortfall > 0}
      title={trade.cash_shortfall > 0 ? "Buyer must settle payment online first" : ""}
      onClick={() =>
        updateField(trade.id, {
          item_released: true,
          status: "completed",
          seller_completion_notified: false,
        })
      }
    >
      Release Item & Complete
    </button>
  )}

</footer>

          </article>
        ))}

      </section>
    </main>
  );
}
