import { useNavigate, useParams } from "react-router-dom";

export default function TransactionPayment() {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f5ee", padding: "24px" }}>
      <section style={{ width: "min(520px, 100%)", background: "white", borderRadius: "24px", padding: "32px", boxShadow: "0 18px 45px rgba(13, 27, 42, 0.08)" }}>
        <p style={{ margin: "0 0 8px", color: "#f0a500", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Payment
        </p>
        <h1 style={{ margin: "0 0 12px", color: "#0d1b2a" }}>Payment step</h1>
        <p style={{ margin: "0 0 18px", color: "#526172", lineHeight: 1.6 }}>
          This transaction is ready for payment. The payment gateway will be connected in the next phase.
        </p>
        <p style={{ margin: "0 0 24px", color: "#526172", fontSize: "0.9rem", wordBreak: "break-word" }}>
          Transaction ID: <strong>{transactionId}</strong>
        </p>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          style={{ border: "none", borderRadius: "14px", padding: "12px 18px", background: "#0d1b2a", color: "white", fontWeight: 800, cursor: "pointer" }}
        >
          Back to messages
        </button>
      </section>
    </main>
  );
}
