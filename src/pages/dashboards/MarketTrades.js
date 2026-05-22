


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../../supabase";
import { notifyError, notifySuccess } from "../../toast";
import "./MarketTrades.css";

/*
Module: MarketTrades.js
Purpose: Staff-facing view for marketplace trade operations and reconciliations.
Units: trade listings, booking/payment controls, filters
Flow: Displays current trades and provides staff actions for processing handovers.
*/

export default function MarketTrades() {

  const [pendingTrades, setPendingTrades] = useState([]);

  const [completedTrades, setCompletedTrades] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [pendingClaim, setPendingClaim] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {

    getCurrentUser();

    fetchTrades();

  }, []);

  // CURRENT USER
  const getCurrentUser = async () => {

    const {
      data: { user }
    } = await supabase.auth.getUser();

    setCurrentUser(user);
  };

  // FETCH MARKET SALES & TRADES
  const fetchTrades = async () => {

    // PENDING
    const {
      data: pending,
      error: pendingError
    } = await supabase
      .from("bookings")
      .select(`
        *,
        listings(title, description),
        buyer:buyer_id(full_name),
        seller:seller_id(full_name)
      `)
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    // COMPLETED
    const {
      data: completed,
      error: completedError
    } = await supabase
      .from("bookings")
      .select(`
        *,
        listings(title, description),
        buyer:buyer_id(full_name),
        seller:seller_id(full_name)
      `)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100);

    if (pendingError || completedError) {

      console.error(
        pendingError?.message ||
        completedError?.message
      );

    } else {

      setPendingTrades(pending || []);

      setCompletedTrades(completed || []);
    }
  };

  // CLAIM SALE / TRADE
  const handleClaimClick = (trade) => {
    setPendingClaim(trade);
  };

  const cancelClaim = () => {
    setPendingClaim(null);
  };

  const confirmClaim = async () => {
    if (!pendingClaim) return;
    setClaimLoading(true);

    const { error } = await supabase
      .from("bookings")
      .update({
        staff_id: currentUser.id,
        status: "assigned"
      })
      .eq("id", pendingClaim.id);

    setClaimLoading(false);

    if (error) {
      notifyError(error.message);
    } else {
      notifySuccess("Sale/trade assigned successfully.");
      fetchTrades();
      setPendingClaim(null);
    }
  };

  const formatSlotTime = (slotTime) => {
    if (!slotTime) return "Not Scheduled";
    return new Date(slotTime).toLocaleString();
  };

  return (

    <main className="market-page">

      {/* HERO */}
      <section className="hero-section">
        <button type="button" className="back-btn-gold" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>

        <span className="hero-kicker">
          MARKET MANAGEMENT
        </span>

        <h1 className="hero-title">
          Marketplace Sales & Trades
        </h1>

        <p className="hero-description">
          Manage marketplace transactions, assign responsibility,
          and monitor completed exchanges.
        </p>

      </section>

      {/* GRID */}
      <section className="market-grid">

        {/* PENDING */}
        <section className="market-column">

          <div className="column-header pending-header">
            Pending Sales & Trades
          </div>

          {pendingTrades.length === 0 && (
            <p className="empty-text">
              No pending sales or trades.
            </p>
          )}

          {pendingTrades.map((trade) => (

            <article
              key={trade.id}
              className="trade-card"
            >

              <div className="trade-top">

                <h3>
                  #{trade.id.slice(0, 6)}
                </h3>

                <span
                  className={
                    trade.staff_id
                      ? "status-tag taken"
                      : "status-tag free"
                  }
                >
                  {trade.staff_id
                    ? "TAKEN"
                    : "FREE"}
                </span>

              </div>

              <h2 className="listing-title">
                {trade.listings?.title || "Marketplace Item"}
              </h2>

              <p className="listing-description">
                {trade.listings?.description ||
                  "No description available."}
              </p>

              <div className="trade-details">

                <p>
                  <strong>Seller:</strong>
                  {" "}
                  {trade.seller?.full_name || "Unknown"}
                </p>

                <p>
                  <strong>Buyer:</strong>
                  {" "}
                  {trade.buyer?.full_name || "Unknown"}
                </p>

                <p>
                  <strong>Status:</strong>
                  {" "}
                  {trade.status}
                </p>

                <p>
                  <strong>Drop-Off:</strong>
                  {" "}
                  {formatSlotTime(trade.dropoff_time || trade.slot_time)}
                </p>

                <p>
                  <strong>Collection:</strong>
                  {" "}
                  {formatSlotTime(trade.collection_time)}
                </p>

              </div>

              {!trade.staff_id && (

                <button
                  className="claim-btn"
                  onClick={() => handleClaimClick(trade)}
                >
                  Claim Sale / Trade
                </button>

              )}

            </article>

          ))}

        </section>

        {/* COMPLETED */}
        <section className="market-column">

          <div className="column-header completed-header">
            Completed Sales & Trades
          </div>

          {completedTrades.length === 0 && (
            <p className="empty-text">
              No completed sales or trades.
            </p>
          )}

          {completedTrades.map((trade) => (

            <article
              key={trade.id}
              className="trade-card completed-card"
            >

              <div className="trade-top">

                <h3>
                  #{trade.id.slice(0, 6)}
                </h3>

                <span className="status-tag done">
                  COMPLETED
                </span>

              </div>

              <h2 className="listing-title">
                {trade.listings?.title || "Marketplace Item"}
              </h2>

              <p>
                <strong>Seller:</strong>
                {" "}
                {trade.seller?.full_name || "Unknown"}
              </p>

              <p>
                <strong>Buyer:</strong>
                {" "}
                {trade.buyer?.full_name || "Unknown"}
              </p>

              <p>
                <strong>Final Status:</strong>
                {" "}
                {trade.status}
              </p>

            </article>

          ))}

        </section>

      </section>

      {pendingClaim && (
        <dialog className="delete-confirm-backdrop" onClick={cancelClaim}>
          <article className="delete-confirm-card" onClick={(event) => event.stopPropagation()}>
            <h2>Confirm assignment</h2>
            <p>Do you want to take responsibility for "{pendingClaim.listings?.title || 'this trade'}"?</p>
            <div className="delete-confirm-actions">
              <button className="btn-cancel-delete" type="button" onClick={cancelClaim}>Cancel</button>
              <button className="btn-confirm-delete" type="button" onClick={confirmClaim} disabled={claimLoading}>
                {claimLoading ? 'Assigning...' : 'Confirm'}
              </button>
            </div>
          </article>
        </dialog>
      )}
    </main>
  );
}


