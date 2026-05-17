


import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import "./MarketTrades.css";

export default function MarketTrades() {

  const [pendingTrades, setPendingTrades] = useState([]);

  const [completedTrades, setCompletedTrades] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

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
  const claimTrade = async (tradeId) => {

    const confirmClaim = window.confirm(
      "Are you sure you want to handle this sale/trade?"
    );

    if (!confirmClaim) return;

    const { error } = await supabase
      .from("bookings")
      .update({
        staff_id: currentUser.id,
        status: "assigned"
      })
      .eq("id", tradeId);

    if (error) {

      console.error(error.message);

    } else {

      fetchTrades();
    }
  };

  return (

    <main className="market-page">

      {/* HERO */}
      <section className="market-hero">

        <span className="market-kicker">
          MARKET MANAGEMENT
        </span>

        <h1 className="market-title">
          Marketplace Sales & Trades
        </h1>

        <p className="market-description">
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
                  {trade.dropoff_time
                    ? new Date(
                        trade.dropoff_time
                      ).toLocaleString()
                    : "Not Scheduled"}
                </p>

                <p>
                  <strong>Collection:</strong>
                  {" "}
                  {trade.collection_time
                    ? new Date(
                        trade.collection_time
                      ).toLocaleString()
                    : "Not Scheduled"}
                </p>

              </div>

              {!trade.staff_id && (

                <button
                  className="claim-btn"
                  onClick={() =>
                    claimTrade(trade.id)
                  }
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

    </main>
  );
}


