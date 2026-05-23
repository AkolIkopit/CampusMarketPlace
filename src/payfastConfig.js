const SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";
const LIVE_URL = "https://www.payfast.co.za/eng/process";

const cleanEnvValue = (value) => {
  if (value == null) return "";

  const trimmed = String(value).trim();
  const quote = trimmed[0];

  if (
    (quote === '"' || quote === "'") &&
    trimmed.length > 1 &&
    trimmed[trimmed.length - 1] === quote
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

export function getPayFastConfig(env = process.env) {
  const mode = "sandbox";

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

  const explicitUrl = cleanEnvValue(env.REACT_APP_PAYFAST_URL);

  const processUrl = SANDBOX_URL;

  const errors = [];

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

  if (explicitUrl && explicitUrl.includes("www.payfast.co.za")) {
    errors.push(
      "REACT_APP_PAYFAST_URL is pointing to live PayFast. This project is sandbox-only. Use https://sandbox.payfast.co.za/eng/process"
    );
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
