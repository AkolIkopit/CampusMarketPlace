import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const body = await req.json();
  const { passphrase, ...fields } = body;

  const ordered = [
    "merchant_id", "merchant_key", "return_url", "cancel_url",
    "notify_url", "name_first", "name_last", "email_address",
    "amount", "item_name", "custom_str1"
  ];

  const queryString = ordered
    .filter((key) => fields[key] !== undefined && fields[key] !== "")
    .map((key) => `${key}=${encodeURIComponent(fields[key].toString().trim())}`)
    .join("&") + `&passphrase=${encodeURIComponent(passphrase.trim())}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(queryString);
  const hashBuffer = await crypto.subtle.digest("MD5", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return new Response(JSON.stringify({ signature }), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
});