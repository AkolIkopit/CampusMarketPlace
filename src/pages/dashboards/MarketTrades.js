import { useEffect, useState } from "react";

import { supabase } from "../../supabase";

import "./AdminDashboard.css";

export default function MarketTrades() {

  const [pendingTrades, setPendingTrades] = useState([]);

  const [completedTrades, setCompletedTrades] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    getCurrentUser();

    fetchTrades();
  }, []);

  // GET CURRENT STAFF USER
  const getCurrentUser = async () => {

    const {
      data: { user }
    } = await supabase.auth.getUser();

    setCurrentUser(user);
  };

  // FETCH TRADES
  const fetchTrades = async () => {

    // PENDING + ASSIGNED
    const { data: pendingData, error: pendingError } =
      await supabase
        .from("trade_bookings")
        .select("*")
        .neq("status", "completed")
        .order("created_at", { ascending: false });

    // COMPLETED
    const { data: completedData, error: completedError } =
      await supabase
        .from("trade_bookings")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(100);

    if (pendingError) {
      console.error(pendingError.message);
    }

    if (completedError) {
      console.error(completedError.message);
    }

    setPendingTrades(pendingData || []);

    setCompletedTrades(completedData || []);
  };

  // CLAIM TRADE
  const claimTrade = async (tradeId) => {

    if (!currentUser) return;

    const confirmed = window.confirm(
      "Are you sure you want to claim this trade?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("trade_bookings")
      .update({
        assigned_staff_id: currentUser.id,
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
    <main className="dashboard-container">

      {/* HERO */}
      <section className="hero-section">

        <span className="hero-kicker">
          MARKET
        </span>

        <h1 className="hero-title">
          Live marketplace trade queue
        </h1>

        <p className="hero-description">
          Claim and manage active marketplace exchanges.
        </p>

      </section>

      {/* TWO COLUMNS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "30px",
          padding: "40px 10%"
        }}
      >

        {/* PENDING TRADES */}
        <section>

          <h2
            style={{
              color: "#0a192f",
              marginBottom: "20px"
            }}
          >
            Pending Trades
          </h2>

          {pendingTrades.length === 0 && (
            <p>No active trades.</p>
          )}

          {pendingTrades.map((trade) => (

            <article
              key={trade.id}
              className="action-block"
              style={{
                marginBottom: "20px"
              }}
            >

              <h3>
                Trade #{trade.id.slice(0, 6)}
              </h3>

              <p>
                Status: {trade.status}
              </p>

              <p>
                Staff:
                {" "}
                {trade.assigned_staff_id
                  ? "TAKEN"
                  : "FREE"}
              </p>

              {!trade.assigned_staff_id && (

                <button
                  className="suspend-btn"
                  onClick={() => claimTrade(trade.id)}
                >
                  Claim Trade
                </button>

              )}

            </article>

          ))}

        </section>

        {/* COMPLETED TRADES */}
        <section>

          <h2
            style={{
              color: "#0a192f",
              marginBottom: "20px"
            }}
          >
            Completed Trades
          </h2>

          {completedTrades.length === 0 && (
            <p>No completed trades yet.</p>
          )}

          {completedTrades.map((trade) => (

            <article
              key={trade.id}
              className="action-block"
              style={{
                marginBottom: "20px"
              }}
            >

              <h3>
                Trade #{trade.id.slice(0, 6)}
              </h3>

              <p>
                COMPLETED
              </p>

            </article>

          ))}

        </section>

      </section>

    </main>
  );
}