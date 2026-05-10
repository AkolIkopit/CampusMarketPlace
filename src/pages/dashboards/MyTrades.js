import { useEffect, useState } from "react";

import { supabase } from "../../supabase";

import "./AdminDashboard.css";

export default function MyTrades() {

  const [trades, setTrades] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {

    loadData();

  }, []);

  const loadData = async () => {

    const {
      data: { user }
    } = await supabase.auth.getUser();

    setCurrentUser(user);

    if (!user) return;

    fetchTrades(user.id);
  };

  // FETCH STAFF TRADES
  const fetchTrades = async (userId) => {

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_staff_id", userId)
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) {

      console.error(error.message);

    } else {

      setTrades(data || []);
    }
  };

  // UPDATE STATUS
  const updateTradeStatus = async (
    tradeId,
    newStatus
  ) => {

    const { error } = await supabase
      .from("bookings")
      .update({
        status: newStatus
      })
      .eq("id", tradeId);

    if (error) {

      console.error(error.message);

    } else {

      fetchTrades(currentUser.id);
    }
  };

  return (
    <main className="dashboard-container">

      {/* HERO */}
      <section className="hero-section">

        <span className="hero-kicker">
          MY TRADES
        </span>

        <h1 className="hero-title">
          Manage assigned marketplace trades
        </h1>

        <p className="hero-description">
          Confirm drop-offs, collections, and complete transactions.
        </p>

      </section>

      {/* TRADES */}
      <section
        style={{
          padding: "40px 10%"
        }}
      >

        {trades.length === 0 && (
          <p>No assigned trades.</p>
        )}

        {trades.map((trade) => (

          <article
            key={trade.id}
            className="action-block"
            style={{
              marginBottom: "25px"
            }}
          >

            <h2>
              Trade #{trade.id.slice(0, 6)}
            </h2>

            <p>
              Current Status:
              {" "}
              <strong>
                {trade.status}
              </strong>
            </p>

            {/* ASSIGNED */}
            {trade.status === "assigned" && (

              <button
                className="approve-btn"
                onClick={() =>
                  updateTradeStatus(
                    trade.id,
                    "dropped_off"
                  )
                }
              >
                Confirm Drop-Off
              </button>

            )}

            {/* DROPPED OFF */}
            {trade.status === "dropped_off" && (

              <button
                className="approve-btn"
                onClick={() =>
                  updateTradeStatus(
                    trade.id,
                    "ready_for_collection"
                  )
                }
              >
                Ready For Collection
              </button>

            )}

            {/* READY */}
            {trade.status === "ready_for_collection" && (

              <button
                className="delete-btn"
                onClick={() =>
                  updateTradeStatus(
                    trade.id,
                    "completed"
                  )
                }
              >
                Complete Trade
              </button>

            )}

          </article>

        ))}

      </section>

    </main>
  );
}
