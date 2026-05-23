import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM_MESSAGE_PREFIX = "[SYSTEM] ";

serve(async (req) => {
  const formData = await req.formData();
  const data: Record<string, string> = {};
  formData.forEach((value, key) => {
    data[key] = value.toString();
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const transactionId = data.custom_str1 || data.m_payment_id;
  const amountPaid = parseFloat(data.amount_gross || "0");
  const paymentStatus = (data.payment_status || "").toUpperCase();
  const paymentReference = data.pf_payment_id || data.m_payment_id || "";

  if (!transactionId || paymentStatus !== "COMPLETE") {
    return new Response("ignored", { status: 200 });
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .select(`
      id,
      buyer_id,
      seller_id,
      listing_id,
      listing_title,
      agreed_amount,
      cash_shortfall_due,
      payment_status,
      payment_reference,
      listings(title, quantity)
    `)
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !transaction) {
    return new Response("not found", { status: 200 });
  }

  if (paymentReference && transaction.payment_reference === paymentReference) {
    return new Response("duplicate", { status: 200 });
  }

  const agreedAmount = parseFloat(transaction.agreed_amount || "0");
  const previousShortfall = parseFloat(transaction.cash_shortfall_due ?? transaction.agreed_amount ?? "0");
  const newShortfall = Math.max(0, previousShortfall - amountPaid);
  const newPaymentStatus = newShortfall === 0 ? "FULLY_PAID" : "pending_payment";
  const totalPaid = Math.max(agreedAmount - newShortfall, 0);

  await supabase
    .from("transactions")
    .update({
      payment_status: newPaymentStatus,
      cash_shortfall_due: newShortfall,
      payment_reference: paymentReference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  // Sandbox and live PayFast credentials are different. Deployed environments
  // must use live PayFast credentials in hosting env vars.
  await supabase
    .from("bookings")
    .update({
      amount_paid: totalPaid,
      cash_shortfall: newShortfall,
      payment_status: newPaymentStatus,
    })
    .eq("transaction_id", transactionId);

  if (newPaymentStatus === "FULLY_PAID" && transaction.listing_id) {
    await supabase
      .from("listings")
      .update({
        status: "sold_out",
        quantity: 0,
      })
      .eq("id", transaction.listing_id);
  }

  const itemTitle = transaction.listing_title || transaction.listings?.title || "the item";
  const messageText = newShortfall > 0
    ? `Payment received for ${itemTitle}. Outstanding balance: R${newShortfall.toFixed(2)}.`
    : `Payment successful for ${itemTitle}. The transaction is fully paid.`;

  await supabase.from("messages").insert([{
    listing_id: transaction.listing_id,
    sender_id: transaction.buyer_id,
    receiver_id: transaction.seller_id,
    message_text: `${SYSTEM_MESSAGE_PREFIX}${messageText}`,
    transaction_id: transactionId,
    is_read: false,
  }]);

  return new Response("OK", { status: 200 });
});