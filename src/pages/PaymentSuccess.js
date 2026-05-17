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
    const paymentId = searchParams.get("pf_payment_id");

    if (!transactionId) {
      setUpdated(true);
      return;
    }

    const { data: transaction } = await supabase
      .from("transactions")
      .select(`
        id,
        buyer_id,
        seller_id,
        listing_id,
        agreed_amount,
        listings ( title )
      `)
      .eq("id", transactionId)
      .maybeSingle();

    if (!transaction) {
      setUpdated(true);
      return;
    }

    await supabase
      .from("transactions")
      .update({
        payment_status: "FULLY_PAID",
        cash_shortfall_due: 0,
        payment_reference: paymentId || "sandbox",
      })
      .eq("id", transaction.id);

    await supabase
      .from("bookings")
      .update({
        amount_paid: parseFloat(transaction.agreed_amount || 0),
        cash_shortfall: 0,
      })
      .eq("transaction_id", transaction.id);

    const itemTitle = transaction.listings?.title || "the item";
    const paidAmount = parseFloat(transaction.agreed_amount || 0).toFixed(2);

    await supabase.from("messages").insert([
      {
        listing_id: transaction.listing_id,
        sender_id: transaction.buyer_id,
        receiver_id: transaction.seller_id,
        message_text: `${SYSTEM_MESSAGE_PREFIX}Payment of R${paidAmount} has been made for ${itemTitle}.`,
        transaction_id: transaction.id,
        is_read: false,
      },
    ]);

    setUpdated(true);
  };

  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ color: "#27500A" }}>✅ Payment Successful</h1>
      <p>
        {updated
          ? "Your payment has been received. The trade facility staff will be notified."
          : "Finalising your payment update..."}
      </p>
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