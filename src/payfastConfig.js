const SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";
const LIVE_URL = "https://www.payfast.co.za/eng/process";

const cleanEnvValue = (value) => {
  if (value == null) return "";

  const trimmed = String(value).trim();
  const quote = trimmed[0];

  if (
    (quote === '"' || quote === "'") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const maskValue = (value, visibleStart = 3, visibleEnd = 3) => {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= visibleStart + visibleEnd) return "***";
  return `${text.slice(0, visibleStart)}***${text.slice(-visibleEnd)}`;
};

export function getPayFastConfig(env = process.env) {
  const rawMode = env.REACT_APP_PAYFAST_MODE || env.PAYFAST_MODE || "sandbox";

  const mode = cleanEnvValue(rawMode).toLowerCase();

  const merchantId = cleanEnvValue(
    env.REACT_APP_PAYFAST_MERCHANT_ID || env.PAYFAST_MERCHANT_ID
  );

  const merchantKey = cleanEnvValue(
    env.REACT_APP_PAYFAST_MERCHANT_KEY || env.PAYFAST_MERCHANT_KEY
  );

  const passphrase = cleanEnvValue(
    env.REACT_APP_PAYFAST_PASSPHRASE || env.PAYFAST_PASSPHRASE
  );

  const returnUrl = cleanEnvValue(env.REACT_APP_PAYFAST_RETURN_URL);
  const cancelUrl = cleanEnvValue(env.REACT_APP_PAYFAST_CANCEL_URL);

  const notifyUrl = cleanEnvValue(
    env.REACT_APP_NOTIFY_URL || env.REACT_APP_PAYFAST_NOTIFY_URL
  );

  const processUrl = mode === "live" ? LIVE_URL : SANDBOX_URL;

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

  if (!returnUrl) {
    errors.push("REACT_APP_PAYFAST_RETURN_URL is required.");
  }

  if (!cancelUrl) {
    errors.push("REACT_APP_PAYFAST_CANCEL_URL is required.");
  }

  if (!notifyUrl) {
    errors.push("REACT_APP_NOTIFY_URL is required.");
  }

  if (mode === "live" && processUrl !== LIVE_URL) {
    errors.push("Live PayFast mode must use the live PayFast process URL.");
  }

  if (mode === "sandbox" && processUrl !== SANDBOX_URL) {
    errors.push("Sandbox PayFast mode must use the sandbox PayFast process URL.");
  }

  const config = {
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

  console.groupCollapsed("[PayFast Config]");
  console.log("Mode:", mode);
  console.log("Process URL:", processUrl);
  console.log("Merchant ID:", merchantId);
  console.log("Merchant ID type:", typeof merchantId);
  console.log("Merchant ID digits only:", /^\d+$/.test(merchantId));
  console.log("Merchant Key:", maskValue(merchantKey));
  console.log("Merchant Key length:", merchantKey.length);
  console.log("Passphrase exists:", Boolean(passphrase));
  console.log("Return URL:", returnUrl);
  console.log("Cancel URL:", cancelUrl);
  console.log("Notify URL:", notifyUrl);
  console.log("Is valid:", config.isValid);
  console.log("Errors:", errors);
  console.groupEnd();

  return config;
}

export { SANDBOX_URL, LIVE_URL };
