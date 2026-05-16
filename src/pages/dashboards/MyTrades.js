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
      .select("*")
      .eq("staff_id", userId)
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) console.error(error.message);
    else setTrades(data || []);
  };

  const updateField = async (tradeId, updates) => {
    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", tradeId);
    if (error) console.error(error.message);
    else fetchTrades(currentUser.id);
  };

  return (
    <main className="dashboard-container">

      <section className="hero-section">
        <span className="hero-kicker">MY TRADES</span>
        <h1 className="hero-title">Manage assigned marketplace trades</h1>
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

            <header className="trade-card-header">
              <span className="trade-id">Trade #{trade.id.slice(0, 6)}</span>
              <span className={`status-pill status-${trade.status}`}>
                {trade.status.replace(/_/g, " ")}
              </span>
            </header>

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
                <span className="info-value outstanding">R {trade.cash_shortfall ?? "0"}</span>
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
                {trade.dropoff_time
                  ? new Date(trade.dropoff_time).toLocaleString()
                  : "Not scheduled"}
              </li>
              <li className="sched-item">
                📅 Collection:{" "}
                {trade.collection_time
                  ? new Date(trade.collection_time).toLocaleString()
                  : "Not scheduled"}
              </li>
            </ul>

            {/* STATUS BADGES */}
            <ul className="checks-row">
              <li className={`check-badge ${trade.item_received ? "yes" : "no"}`}>
                {trade.item_received ? "✅" : "❌"} Item received
              </li>
              <li className={`check-badge ${trade.cash_settled ? "yes" : "no"}`}>
                {trade.cash_settled ? "✅" : "❌"} Cash settled
              </li>
              <li className={`check-badge ${trade.item_released ? "yes" : "no"}`}>
                {trade.item_released ? "✅" : "❌"} Item released
              </li>
            </ul>

            {/* ACTIONS */}
            <footer className="actions-row">

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

              {trade.status === "ready_for_collection" && !trade.cash_settled && (
                <button
                  className="btn btn-success"
                  onClick={() =>
                    updateField(trade.id, { cash_settled: true })
                  }
                >
                  Confirm Cash Payment
                </button>
              )}

              {trade.status === "ready_for_collection" && (
                <button
                  className="btn btn-danger"
                  disabled={!trade.cash_settled}
                  title={!trade.cash_settled ? "Settle cash first" : ""}
                  onClick={() =>
                    updateField(trade.id, {
                      item_released: true,
                      status: "completed",
                    })
                  }
                >
                  Release Item & Complete
                </button>
              )}
              {trade.status === "ready_for_collection" && !trade.cash_settled && trade.cash_shortfall > 0 && (
  <p className="cash-warning">
    ⚠️ Collect R{trade.cash_shortfall} cash from buyer before releasing item
  </p>
)}

            </footer>

          </article>
        ))}

      </section>
    </main>
  );
}