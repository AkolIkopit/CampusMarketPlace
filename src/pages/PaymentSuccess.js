import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

  const handlePaymentSuccess = async () => {
    // PayFast appends these to the return_url
    const paymentId = searchParams.get("pf_payment_id");

    // get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // find the most recent unpaid/partial transaction for this buyer
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id, agreed_amount, cash_shortfall_due")
      .eq("buyer_id", user.id)
      .in("payment_status", ["unpaid", "PARTIAL_PAID"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!transaction) {
      setDone(true);
      return;
    }

    // for sandbox testing assume full payment
    const newShortfall = 0;
    const newPaymentStatus = "FULLY_PAID";

    // update transaction
    await supabase
      .from("transactions")
      .update({
        payment_status: newPaymentStatus,
        cash_shortfall_due: newShortfall,
        payment_reference: paymentId || "sandbox",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // update linked booking
    await supabase
      .from("bookings")
      .update({
        amount_paid: parseFloat(transaction.agreed_amount),
        cash_shortfall: 0,
        payment_status: newPaymentStatus,
      })
      .eq("id", transaction.id);

    setDone(true);
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
          cursor: "pointer"
        }}
      >
        Back to Messages
      </button>
    </main>
  );
}