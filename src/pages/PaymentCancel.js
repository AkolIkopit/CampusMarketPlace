/*
Module: PaymentCancel.js
Purpose: Page shown when payment is cancelled or fails.
Units: presentational component showing failure/cancellation and actions.
Flow: Displays cancellation message and guidance to retry or contact support.
*/
import React from 'react';
import { useNavigate } from "react-router-dom";

export default function PaymentCancel() {
  const navigate = useNavigate();
  return (
    <main style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ color: "#A32D2D" }}>❌ Payment Cancelled</h1>
      <p>Your payment was cancelled. Your booking is still reserved.</p>
      <button onClick={() => navigate("/messages")} style={{ marginTop: "20px", padding: "12px 24px", background: "#0d1b2a", color: "#f0a500", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>
        Back to Messages
      </button>
    </main>
  );
}