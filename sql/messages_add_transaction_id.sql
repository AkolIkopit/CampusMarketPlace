-- Add a transaction association to messages so chat threads can reference an offer/trade.
-- Run this script in the Supabase SQL Editor.

alter table public.messages
  add column if not exists transaction_id uuid;
