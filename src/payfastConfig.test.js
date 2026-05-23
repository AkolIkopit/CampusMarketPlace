import { getPayFastConfig, LIVE_URL, SANDBOX_URL } from "./payfastConfig";

const baseEnv = {
  REACT_APP_PAYFAST_MERCHANT_ID: "10000100",
  REACT_APP_PAYFAST_MERCHANT_KEY: "abc123def4567",
  REACT_APP_PAYFAST_PASSPHRASE: "secret",
  REACT_APP_PAYFAST_RETURN_URL: "https://example.com/payment/success",
  REACT_APP_PAYFAST_CANCEL_URL: "https://example.com/payment/cancel",
  REACT_APP_NOTIFY_URL: "https://example.supabase.co/functions/v1/payfast-notify",
};

describe("getPayFastConfig", () => {
  it("selects the sandbox endpoint by default", () => {
    expect(getPayFastConfig(baseEnv)).toEqual(expect.objectContaining({
      mode: "sandbox",
      processUrl: SANDBOX_URL,
      isValid: true,
    }));
  });

  it("selects the live endpoint in live mode", () => {
    expect(getPayFastConfig({ ...baseEnv, REACT_APP_PAYFAST_MODE: "live" })).toEqual(expect.objectContaining({
      mode: "live",
      processUrl: LIVE_URL,
      isValid: true,
    }));
  });

  it("trims and unquotes PayFast credential values", () => {
    const config = getPayFastConfig({
      ...baseEnv,
      REACT_APP_PAYFAST_MERCHANT_ID: ' "10000100" ',
      REACT_APP_PAYFAST_MERCHANT_KEY: " 'abc123def4567' ",
    });

    expect(config.merchantId).toBe("10000100");
    expect(config.merchantKey).toBe("abc123def4567");
    expect(config.isValid).toBe(true);
  });

  it("rejects non-numeric merchant ids", () => {
    const config = getPayFastConfig({ ...baseEnv, REACT_APP_PAYFAST_MERCHANT_ID: "abc" });

    expect(config.isValid).toBe(false);
    expect(config.errors).toContain("REACT_APP_PAYFAST_MERCHANT_ID must contain digits only.");
  });

  it("rejects merchant keys that are not exactly 13 characters", () => {
    const config = getPayFastConfig({ ...baseEnv, REACT_APP_PAYFAST_MERCHANT_KEY: "too-short" });

    expect(config.isValid).toBe(false);
    expect(config.errors).toContain("REACT_APP_PAYFAST_MERCHANT_KEY must be exactly 13 characters.");
  });

  it("rejects mismatched live and sandbox URLs", () => {
    const config = getPayFastConfig({
      ...baseEnv,
      REACT_APP_PAYFAST_MODE: "live",
      REACT_APP_PAYFAST_URL: SANDBOX_URL,
    });

    expect(config.isValid).toBe(false);
    expect(config.errors).toContain("Live PayFast mode cannot use the sandbox PayFast process URL.");
  });
});