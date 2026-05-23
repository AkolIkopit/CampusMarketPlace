/*
Module: TransactionPayment.js
Purpose: Handles payment flow for a transaction (payment form + redirect/confirmation).
Units: UI form, payment submission logic, success/cancel handling.
Flow: Renders transaction payment UI and coordinates with backend/payment gateway to complete payments.
*/

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "./TransactionPayment.css";
import md5 from "blueimp-md5";

// PayFast Sandbox configuration
const PAYFAST_URL  = "https://sandbox.payfast.co.za/eng/process";
const MERCHANT_ID  = "10048982";
const MERCHANT_KEY = "8fr5hx4alngq6";
const PASSPHRASE   = "andre12345678";
const RETURN_URL   = window.location.hostname === "localhost"
  ? "http://localhost:3000/payment/success"
  : "https://unimart-ekbjezg8fmfnhfes.austriaeast-01.azurewebsites.net/payment/success";
const CANCEL_URL   = window.location.hostname === "localhost"
  ? "http://localhost:3000/payment/cancel"
  : "https://unimart-ekbjezg8fmfnhfes.austriaeast-01.azurewebsites.net/payment/cancel";
const NOTIFY_URL   = "";

export default function TransactionPayment() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTransaction();
  }, [transactionId]);

const fetchTransaction = async () => {
  const { data, error } = await supabase
    .from("transactions")
   .select(`
  *,
  listings (
    title
  )
`)
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !data) {
    setError("Transaction not found.");
    setLoading(false);
    return;
  }

  setTransaction(data);
  setPayAmount(
    data.cash_shortfall_due > 0
      ? data.cash_shortfall_due.toFixed(2)
      : data.agreed_amount.toFixed(2)
  );

  setLoading(false);
};

const handlePayment = async () => {
  const amount = parseFloat(payAmount);
  const outstandingAmount = Number(transaction.cash_shortfall_due ?? transaction.agreed_amount ?? 0);

  if (!amount || amount <= 0) {
    setError("Please enter a valid amount.");
    return;
  }

  if (amount > outstandingAmount) {
    setError("Payment amount cannot be more than the outstanding balance.");
    return;
  }


  // Build only required fields — no empty values
  const fields = {
    merchant_id:  MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url:   RETURN_URL,
    cancel_url:   CANCEL_URL,
    amount:       amount.toFixed(2),
    item_name:    "UniMart Purchase",
  };

  // Only include notify_url if it has a value
  if (NOTIFY_URL) fields.notify_url = NOTIFY_URL;

  // Build signature string per PayFast spec
  const pfParamString = Object.entries(fields)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, "+")}`)
    .join("&");

  // Append passphrase if set on the merchant account
  const signatureInput = PASSPHRASE
    ? `${pfParamString}&passphrase=${encodeURIComponent(PASSPHRASE.trim()).replace(/%20/g, "+")}`
    : pfParamString;

  const signature = md5(signatureInput);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = PAYFAST_URL;

  [...Object.entries(fields), ["signature", signature]].forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type  = "hidden";
    input.name  = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};
  if (loading) return <main className="payment-container"><p>Loading...</p></main>;
  if (error) return <main className="payment-container"><p className="payment-error">{error}</p></main>;

 const agreedAmount = Number(
  transaction.listing_price ||
  transaction.agreed_amount ||
  0
);
  const outstandingAmount = Number(transaction.cash_shortfall_due ?? agreedAmount);
  const isPartial = outstandingAmount > 0 && outstandingAmount < agreedAmount;
  const amountPaid = Math.max(agreedAmount - outstandingAmount, 0);
  const paymentComplete =
    String(transaction.payment_status || "").toLowerCase() === "fully_paid" ||
    outstandingAmount <= 0;
  return (
    <main className="payment-container">

      <section className="payment-hero">
        <span className="payment-kicker">SECURE PAYMENT</span>
        <h1 className="payment-title">Complete Your Payment</h1>
        <p className="payment-desc">Powered by PayFast</p>
      </section>

      <section className="payment-card">

        <header className="payment-card-header">
      <h2>
  {
    transaction.listing_title ||
    transaction.listings?.title ||
    "Deleted Listing"
  }
</h2>
          <span className={`payment-status-pill ${transaction.payment_status}`}>
            {transaction.payment_status.replace(/_/g, " ")}
          </span>
        </header>

        <ul className="payment-info-grid">
          <li className="payment-info-item">
            <span className="payment-info-label">Agreed Price</span>
            <span className="payment-info-value">
              R {agreedAmount.toFixed(2)}
            </span>
          </li>
          <li className="payment-info-item">
            <span className="payment-info-label">Amount Paid</span>
            <span className="payment-info-value">
              R {amountPaid.toFixed(2)}
            </span>
          </li>
          <li className="payment-info-item">
            <span className="payment-info-label">Outstanding Balance</span>
            <span className="payment-info-value outstanding">
              R {parseFloat(outstandingAmount).toFixed(2)}
            </span>
          </li>
          <li className="payment-info-item">
            <span className="payment-info-label">Transaction Type</span>
            <span className="payment-info-value">{transaction.transaction_type}</span>
          </li>
        </ul>
       

        {paymentComplete ? (

          <section className="payment-complete">
            <p>✅ Payment complete. No outstanding balance.</p>
            <button className="btn btn-primary" onClick={() => navigate("/messages")}>
              Back to Messages
            </button>
          </section>

        ) : (

          <section className="payment-form">

            {isPartial && (
              <p className="partial-warning">
                You have an outstanding balance of R{outstandingAmount.toFixed(2)}.
                You can pay the full balance or a partial amount.
              </p>
            )}

            <label className="payment-label" htmlFor="payAmount">
              Amount to Pay (R)
            </label>
            <input
              id="payAmount"
              type="number"
              className="payment-input"
              value={payAmount}
              min="1"
              max={outstandingAmount}
              step="0.01"
              onChange={(e) => {
                setError("");
                setPayAmount(e.target.value);
              }}
            />

            {error && <p className="payment-error">{error}</p>}

           <footer className="payment-actions">
  <button className="btn btn-secondary" onClick={() => navigate("/messages")}>
    Cancel
  </button>
  <button
    className="btn btn-primary"
    onClick={handlePayment}
    style={{ zIndex: 9999, position: "relative", pointerEvents: "all" }}
  >
    Pay R{parseFloat(payAmount || 0).toFixed(2)} via PayFast
  </button>
</footer>

          </section>

        )}

      </section>

    </main>
  );
}
