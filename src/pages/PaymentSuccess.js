import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";

const SYSTEM_MESSAGE_PREFIX = "[SYSTEM] ";

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
    const transactionId = searchParams.get("transaction");

    // get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let transactionQuery = supabase
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
      .eq("buyer_id", user.id);

    if (transactionId) {
      transactionQuery = transactionQuery.eq("id", transactionId);
    } else {
      transactionQuery = transactionQuery
        .in("payment_status", ["pending", "pending_payment", "PARTIAL_PAID"])
        .order("created_at", { ascending: false })
        .limit(1);
    }

    const { data: transaction } = await transactionQuery.maybeSingle();

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
      })
      .eq("id", transaction.id);

    // update linked booking
    await supabase
      .from("bookings")
      .update({
        amount_paid: parseFloat(transaction.agreed_amount),
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
