/*
Module: PaymentSuccess.js
Purpose: Simple page shown after returning from PayFast.
Units: confirmation/pending state display.
Flow: Refetches backend payment status that is updated by the PayFast ITN webhook.
*/

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    const transactionId = searchParams.get("transaction");

    if (!transactionId) {
      setStatus("unknown");
      return;
    }

    const checkPaymentStatus = async (attempt = 0) => {
      const { data: transaction } = await supabase
        .from("transactions")
        .select("payment_status, cash_shortfall_due")
        .eq("id", transactionId)
        .maybeSingle();

      if (cancelled) return;

      const paymentStatus = String(transaction?.payment_status || "").toLowerCase();
      if (["fully_paid", "paid", "complete", "successful"].includes(paymentStatus)) {
        setStatus("paid");
        return;
      }

      if (attempt >= 4) {
        setStatus("pending");
        return;
      }

      window.setTimeout(() => checkPaymentStatus(attempt + 1), 2000);
    };

    checkPaymentStatus();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const isPaid = status === "paid";

  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ color: "#27500A" }}>
        {isPaid ? "Payment Successful" : "Payment Processing"}
      </h1>
      <p>
        {isPaid
          ? "Your payment has been confirmed. The listing and chat have been updated."
          : "PayFast is still confirming your payment. You can return to messages and refresh shortly."}
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