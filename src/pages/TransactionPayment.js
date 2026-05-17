import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "./TransactionPayment.css";
import md5 from "blueimp-md5";
console.log("md5 loaded:", typeof md5);
const PAYFAST_SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";
const MERCHANT_ID = "10048982";
const MERCHANT_KEY = "8fr5hx4alngq6";
const PASSPHRASE = "andre12345678";
const NOTIFY_URL = "https://pjqoghabztvrywvwvfdp.supabase.co/functions/v1/payfast-notify";

export default function TransactionPayment() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [buyerProfile, setBuyerProfile] = useState(null);
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
      listings ( title )
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

  // get profile without email
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.buyer_id)
    .maybeSingle();

  // get email from auth user
  const { data: { user } } = await supabase.auth.getUser();

  setBuyerProfile({
    full_name: profile?.full_name || "",
    email: user?.email || "",
  });

  setLoading(false);
};

const handlePayment = async () => {
  const amount = parseFloat(payAmount);

  if (!amount || amount <= 0) {
    setError("Please enter a valid amount.");
    return;
  }

  const fields = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: `${window.location.origin}/payment/success?transaction=${transaction.id}`,
    cancel_url: `${window.location.origin}/payment/cancel?transaction=${transaction.id}`,
    notify_url: NOTIFY_URL,
    amount: amount.toFixed(2),
    item_name: "UniMart Purchase",
  };

  // Generate signature correctly
  const queryString = Object.entries(fields)
    .map(([key, value]) =>
      `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`
    )
    .join("&");

  const signature = md5(
    `${queryString}&passphrase=${encodeURIComponent(PASSPHRASE).replace(/%20/g, "+")}`
  );

  const form = document.createElement("form");
  form.method = "POST";
  form.action = PAYFAST_SANDBOX_URL;

  const allFields = {
    ...fields,
    signature,
  };

  Object.entries(allFields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};
  if (loading) return <main className="payment-container"><p>Loading...</p></main>;
  if (error) return <main className="payment-container"><p className="payment-error">{error}</p></main>;

  const isPartial = transaction.cash_shortfall_due > 0;
  const outstandingAmount = isPartial
    ? transaction.cash_shortfall_due
    : transaction.agreed_amount;
console.log("Rendering — payment_status:", transaction?.payment_status);
console.log("Rendering — isPartial:", isPartial);
console.log("Rendering — payAmount:", payAmount);
  return (
    <main className="payment-container">

      <section className="payment-hero">
        <span className="payment-kicker">SECURE PAYMENT</span>
        <h1 className="payment-title">Complete Your Payment</h1>
        <p className="payment-desc">Powered by PayFast</p>
      </section>

      <section className="payment-card">

        <header className="payment-card-header">
          <h2>{transaction.listings?.title || "UniMart Purchase"}</h2>
          <span className={`payment-status-pill ${transaction.payment_status}`}>
            {transaction.payment_status.replace(/_/g, " ")}
          </span>
        </header>

        <ul className="payment-info-grid">
          <li className="payment-info-item">
            <span className="payment-info-label">Agreed Price</span>
            <span className="payment-info-value">
              R {parseFloat(transaction.agreed_amount).toFixed(2)}
            </span>
          </li>
          <li className="payment-info-item">
            <span className="payment-info-label">Amount Paid</span>
            <span className="payment-info-value">
              R {(parseFloat(transaction.agreed_amount) - parseFloat(transaction.cash_shortfall_due)).toFixed(2)}
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
       

        {String(transaction.payment_status || "").toLowerCase() === "fully_paid" ? (

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
                ⚠️ You have an outstanding balance of R{parseFloat(transaction.cash_shortfall_due).toFixed(2)}.
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
    onClick={() => {
      console.log("Button clicked");
      handlePayment();
    }}
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
