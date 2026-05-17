import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";

const SYSTEM_MESSAGE_PREFIX = "[SYSTEM] ";

async function getProfileName(userId, fallback = "A student") {
  if (!userId) return fallback;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name || fallback;
}

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
    const paidAmountFromReturn = parseFloat(searchParams.get("amount") || "0");

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
        cash_shortfall_due,
        listings ( title )
      `)
      .eq("id", transactionId)
      .maybeSingle();

    if (!transaction) {
      setUpdated(true);
      return;
    }

    const currentShortfall = Math.max(
      Number(transaction.cash_shortfall_due ?? transaction.agreed_amount ?? 0),
      0
    );
    const paidAmount = paidAmountFromReturn > 0 ? paidAmountFromReturn : currentShortfall;
    const newShortfall = Math.max(currentShortfall - paidAmount, 0);
    const newPaymentStatus = newShortfall > 0 ? "pending_payment" : "FULLY_PAID";
    const totalPaid = Math.max(Number(transaction.agreed_amount || 0) - newShortfall, 0);

    await supabase
      .from("transactions")
      .update({
        payment_status: newPaymentStatus,
        cash_shortfall_due: newShortfall,
        payment_reference: paymentId || "sandbox",
      })
      .eq("id", transaction.id);

    await supabase
      .from("bookings")
      .update({
        amount_paid: totalPaid,
        cash_shortfall: newShortfall,
      })
      .eq("transaction_id", transaction.id);

    const itemTitle = transaction.listings?.title || "the item";
    const buyerName = await getProfileName(transaction.buyer_id, "The buyer");
    const messageText = newShortfall > 0
      ? `${SYSTEM_MESSAGE_PREFIX}${buyerName} paid R${paidAmount.toFixed(2)} for ${itemTitle}. Outstanding balance: R${newShortfall.toFixed(2)}.`
      : `${SYSTEM_MESSAGE_PREFIX}${buyerName} paid R${paidAmount.toFixed(2)} for ${itemTitle}. The item is fully paid.`;

    await supabase.from("messages").insert([
      {
        listing_id: transaction.listing_id,
        sender_id: transaction.buyer_id,
        receiver_id: transaction.seller_id,
        message_text: messageText,
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
