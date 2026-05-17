import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ color: "#27500A" }}>✅ Payment Successful</h1>
      <p>Your payment has been received. The trade facility staff will be notified.</p>
      <button onClick={() => navigate("/messages")} style={{ marginTop: "20px", padding: "12px 24px", background: "#0d1b2a", color: "#f0a500", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>
        Back to Messages
      </button>
    </main>
  );
}