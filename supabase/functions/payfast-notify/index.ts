import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const transactionId = data.custom_str1;
  const amountPaid = parseFloat(data.amount_gross || "0");
  const paymentStatus = data.payment_status;

  if (!transactionId || paymentStatus !== "COMPLETE") {
    return new Response("ignored", { status: 200 });
  }

  // fetch current transaction
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("agreed_amount, cash_shortfall_due")
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !transaction) {
    return new Response("not found", { status: 200 });
  }

  const agreedAmount = parseFloat(transaction.agreed_amount || "0");
  const previousShortfall = parseFloat(transaction.cash_shortfall_due || "0");

  // calculate new shortfall after this payment
  const newShortfall = Math.max(0, previousShortfall - amountPaid);
  const newPaymentStatus = newShortfall === 0 ? "FULLY_PAID" : "PARTIAL_PAID";

  await supabase
    .from("transactions")
    .update({
      payment_status: newPaymentStatus,
      cash_shortfall_due: newShortfall,
      payment_reference: data.pf_payment_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  // also update the linked booking
  await supabase
    .from("bookings")
    .update({
      amount_paid: agreedAmount - newShortfall,
      cash_shortfall: newShortfall,
      payment_status: newPaymentStatus,
    })
    .eq("id", transactionId);

  return new Response("OK", { status: 200 });
});