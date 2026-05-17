import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

 const handlePaymentSuccess = async () => {
  const transactionId = searchParams.get("transaction");
  console.log("Transaction ID from URL:", transactionId);
  if (!transactionId) { setUpdated(true); return; }

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, agreed_amount, cash_shortfall_due, listing_id, buyer_id")
    .eq("id", transactionId)
    .maybeSingle();

  console.log("Transaction data:", transaction);

  if (!transaction) { setUpdated(true); return; }

  await supabase
    .from("transactions")
    .update({
      payment_status: "FULLY_PAID",
      cash_shortfall_due: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  console.log("Updating booking with listing_id:", transaction.listing_id, "buyer_id:", transaction.buyer_id);

  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .update({
      amount_paid: parseFloat(transaction.agreed_amount),
      cash_shortfall: 0,
      payment_status: "FULLY_PAID",
    })
    .eq("listing_id", transaction.listing_id)
    .eq("buyer_id", transaction.buyer_id)
    .select();

  console.log("Booking update result:", bookingData, "Error:", bookingError);

  setUpdated(true);
};

  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ color: "#27500A" }}>✅ Payment Successful</h1>
      <p>Your payment has been received. The trade facility staff will be notified.</p>
      <button
        onClick={() => navigate("/messages")}
        style={{
          marginTop: "20px",
          padding: "12px 24px",
          background: "#0d1b2a",
          color: "#f0a500",
          border: "none",
          borderRadius: "10px",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        Back to Messages
      </button>
    </main>
  );
}