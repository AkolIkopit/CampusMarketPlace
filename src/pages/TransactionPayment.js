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
import { getPayFastConfig } from "../payfastConfig";

const maskValue = (value, visibleStart = 3, visibleEnd = 3) => {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= visibleStart + visibleEnd) return "***";
  return `${text.slice(0, visibleStart)}***${text.slice(-visibleEnd)}`;
};

const buildSafeLogFields = (fields) => ({
  ...fields,
  merchant_key: maskValue(fields.merchant_key),
});

export default function TransactionPayment() {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const fetchTransaction = async () => {
    console.groupCollapsed("[PayFast Payment Page] Fetch transaction");
    console.log("Transaction ID from URL:", transactionId);

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        listings (
          title
        )
      `
      )
      .eq("id", transactionId)
      .maybeSingle();

    console.log("Supabase transaction error:", error);
    console.log("Supabase transaction data:", data);
    console.groupEnd();

    if (error || !data) {
      setError("Transaction not found.");
      setLoading(false);
      return;
    }

    setTransaction(data);

    const initialAmount =
      Number(data.cash_shortfall_due) > 0
        ? Number(data.cash_shortfall_due).toFixed(2)
        : Number(data.agreed_amount || data.listing_price || 0).toFixed(2);

    console.log("[PayFast Payment Page] Initial payment amount:", initialAmount);

    setPayAmount(initialAmount);
    setLoading(false);
  };

  const handlePayment = async () => {
    console.groupCollapsed("[PayFast Submit] Start payment submit");

    try {
      setError("");

      console.log("Current URL:", window.location.href);
      console.log("Transaction ID:", transactionId);
      console.log("Raw payAmount state:", payAmount);
      console.log("Transaction object:", transaction);

      if (!transaction) {
        console.error("No transaction loaded.");
        setError("Transaction could not be loaded. Please refresh and try again.");
        console.groupEnd();
        return;
      }

      const amount = parseFloat(payAmount);

      const agreedAmount = Number(
        transaction.listing_price || transaction.agreed_amount || 0
      );

      const outstandingAmount = Number(
        transaction.cash_shortfall_due ?? agreedAmount
      );

      console.log("Parsed payment amount:", amount);
      console.log("Agreed amount:", agreedAmount);
      console.log("Outstanding amount:", outstandingAmount);

      const payFastConfig = getPayFastConfig();

      console.log("PayFast config valid:", payFastConfig.isValid);
      console.log("PayFast config mode:", payFastConfig.mode);
      console.log("PayFast process URL:", payFastConfig.processUrl);
      console.log("PayFast config errors:", payFastConfig.errors);

      if (!amount || amount <= 0) {
        console.error("Invalid amount:", amount);
        setError("Please enter a valid amount.");
        console.groupEnd();
        return;
      }

      if (amount > outstandingAmount) {
        console.error("Amount exceeds outstanding balance.", {
          amount,
          outstandingAmount,
        });
        setError("Payment amount cannot be more than the outstanding balance.");
        console.groupEnd();
        return;
      }

      if (!payFastConfig.isValid) {
        console.error("Invalid PayFast configuration", {
          mode: payFastConfig.mode,
          processUrl: payFastConfig.processUrl,
          merchantId: payFastConfig.merchantId,
          merchantKeyLength: payFastConfig.merchantKey.length,
          returnUrl: payFastConfig.returnUrl,
          cancelUrl: payFastConfig.cancelUrl,
          notifyUrl: payFastConfig.notifyUrl,
          errors: payFastConfig.errors,
        });

        setError("Payment is not configured correctly. Please contact support.");
        console.groupEnd();
        return;
      }

      const fields = {
        merchant_id: payFastConfig.merchantId,
        merchant_key: payFastConfig.merchantKey,
        return_url: `${payFastConfig.returnUrl}?transaction=${transactionId}`,
        cancel_url: payFastConfig.cancelUrl,
        notify_url: payFastConfig.notifyUrl,
        amount: amount.toFixed(2),
        item_name: "UniMart Purchase",
        custom_str1: transactionId,
      };

      console.log("PayFast fields before signature:", buildSafeLogFields(fields));
      console.log("merchant_id value:", fields.merchant_id);
      console.log("merchant_id type:", typeof fields.merchant_id);
      console.log("merchant_id digits only:", /^\d+$/.test(fields.merchant_id));
      console.log("merchant_key length:", fields.merchant_key.length);
      console.log("Posting to PayFast URL:", payFastConfig.processUrl);

      const pfParamString = Object.entries(fields)
        .map(
          ([key, value]) =>
            `${key}=${encodeURIComponent(String(value).trim()).replace(
              /%20/g,
              "+"
            )}`
        )
        .join("&");

      const signatureInput = payFastConfig.passphrase
        ? `${pfParamString}&passphrase=${encodeURIComponent(
            payFastConfig.passphrase
          ).replace(/%20/g, "+")}`
        : pfParamString;

      const signature = md5(signatureInput);

      console.log("PayFast param string without passphrase:", pfParamString);
      console.log("Passphrase exists:", Boolean(payFastConfig.passphrase));
      console.log("Signature:", maskValue(signature, 6, 6));

      const form = document.createElement("form");
      form.method = "POST";
      form.action = payFastConfig.processUrl;

      [...Object.entries(fields), ["signature", signature]].forEach(
        ([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
      );

      const submittedFormData = Array.from(form.elements).reduce((acc, input) => {
        acc[input.name] =
          input.name === "merchant_key" || input.name === "signature"
            ? maskValue(input.value)
            : input.value;
        return acc;
      }, {});

      console.log("Final hidden form action:", form.action);
      console.log("Final hidden form method:", form.method);
      console.log("Final hidden form data:", submittedFormData);

      document.body.appendChild(form);

      console.log("Submitting form to PayFast now...");
      console.groupEnd();

      form.submit();
    } catch (err) {
      console.error("[PayFast Submit] Unexpected error:", err);
      setError("Something went wrong while starting payment. Check the console logs.");
      console.groupEnd();
    }
  };

  if (loading) {
    return (
      <main className="payment-container">
        <p>Loading.</p>
      </main>
    );
  }

  if (error && !transaction) {
    return (
      <main className="payment-container">
        <p className="payment-error">{error}</p>
      </main>
    );
  }

  const agreedAmount = Number(
    transaction.listing_price || transaction.agreed_amount || 0
  );

  const outstandingAmount = Number(transaction.cash_shortfall_due ?? agreedAmount);

  const isPartial = outstandingAmount > 0 && outstandingAmount < agreedAmount;

  const amountPaid = Math.max(agreedAmount - outstandingAmount, 0);

  const paymentComplete = [
    "fully_paid",
    "paid",
    "complete",
    "successful",
  ].includes(String(transaction.payment_status || "").toLowerCase());

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
            {transaction.listing_title ||
              transaction.listings?.title ||
              "Deleted Listing"}
          </h2>

          <span className={`payment-status-pill ${transaction.payment_status}`}>
            {String(transaction.payment_status || "pending").replace(/_/g, " ")}
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
            <span className="payment-info-value">R {amountPaid.toFixed(2)}</span>
          </li>

          <li className="payment-info-item">
            <span className="payment-info-label">Outstanding Balance</span>
            <span className="payment-info-value outstanding">
              R {outstandingAmount.toFixed(2)}
            </span>
          </li>

          <li className="payment-info-item">
            <span className="payment-info-label">Transaction Type</span>
            <span className="payment-info-value">
              {transaction.transaction_type}
            </span>
          </li>
        </ul>

        {paymentComplete ? (
          <section className="payment-complete">
            <p>Payment complete. No outstanding balance.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/messages")}
            >
              Back to Messages
            </button>
          </section>
        ) : (
          <section className="payment-form">
            {isPartial && (
              <p className="partial-warning">
                You have an outstanding balance of R
                {outstandingAmount.toFixed(2)}. You can pay the full balance or a
                partial amount.
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
              onChange={(event) => {
                setError("");
                setPayAmount(event.target.value);
              }}
            />

            {error && <p className="payment-error">{error}</p>}

            <footer className="payment-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/messages")}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                onClick={handlePayment}
                style={{
                  zIndex: 9999,
                  position: "relative",
                  pointerEvents: "all",
                }}
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
