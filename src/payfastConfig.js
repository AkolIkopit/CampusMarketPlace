const SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";
const LIVE_URL = "https://www.payfast.co.za/eng/process";

const cleanEnvValue = (value) => {
  if (value == null) return "";
  const trimmed = String(value).trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed[trimmed.length - 1] === quote) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

export function getPayFastConfig(env = process.env) {
  const mode = cleanEnvValue(env.REACT_APP_PAYFAST_MODE || env.PAYFAST_MODE || "sandbox").toLowerCase();
  const merchantId = cleanEnvValue(env.REACT_APP_PAYFAST_MERCHANT_ID || env.PAYFAST_MERCHANT_ID);
  const merchantKey = cleanEnvValue(env.REACT_APP_PAYFAST_MERCHANT_KEY || env.PAYFAST_MERCHANT_KEY);
  const passphrase = cleanEnvValue(env.REACT_APP_PAYFAST_PASSPHRASE || env.PAYFAST_PASSPHRASE);
  const returnUrl = cleanEnvValue(env.REACT_APP_PAYFAST_RETURN_URL);
  const cancelUrl = cleanEnvValue(env.REACT_APP_PAYFAST_CANCEL_URL);
  const notifyUrl = cleanEnvValue(env.REACT_APP_NOTIFY_URL || env.REACT_APP_PAYFAST_NOTIFY_URL);
  const explicitUrl = cleanEnvValue(env.REACT_APP_PAYFAST_URL);
  const processUrl = explicitUrl || (mode === "live" ? LIVE_URL : SANDBOX_URL);

  const errors = [];

  if (!["sandbox", "live"].includes(mode)) {
    errors.push("REACT_APP_PAYFAST_MODE must be either sandbox or live.");
  }
  if (!merchantId) {
    errors.push("REACT_APP_PAYFAST_MERCHANT_ID is required.");
  } else if (!/^\d+$/.test(merchantId)) {
    errors.push("REACT_APP_PAYFAST_MERCHANT_ID must contain digits only.");
  } else if (!Number.isSafeInteger(Number(merchantId))) {
    errors.push("REACT_APP_PAYFAST_MERCHANT_ID must be a valid integer.");
  }
  if (!merchantKey) {
    errors.push("REACT_APP_PAYFAST_MERCHANT_KEY is required.");
  } else if (merchantKey.length !== 13) {
    errors.push("REACT_APP_PAYFAST_MERCHANT_KEY must be exactly 13 characters.");
  }
  if (!returnUrl) errors.push("REACT_APP_PAYFAST_RETURN_URL is required.");
  if (!cancelUrl) errors.push("REACT_APP_PAYFAST_CANCEL_URL is required.");
  if (!notifyUrl) errors.push("REACT_APP_NOTIFY_URL is required.");

  if (mode === "live" && processUrl.includes("sandbox.payfast.co.za")) {
    errors.push("Live PayFast mode cannot use the sandbox PayFast process URL.");
  }
  if (mode === "sandbox" && processUrl.includes("www.payfast.co.za")) {
    errors.push("Sandbox PayFast mode cannot use the live PayFast process URL.");
  }

  return {
    mode,
    processUrl,
    merchantId,
    merchantKey,
    passphrase,
    returnUrl,
    cancelUrl,
    notifyUrl,
    isValid: errors.length === 0,
    errors,
  };
}

export { SANDBOX_URL, LIVE_URL };