-- Add the optional trade_item field so trade requests can be stored safely.
-- Run this script in the Supabase SQL Editor.

alter table public.transactions
  add column if not exists trade_item text;
