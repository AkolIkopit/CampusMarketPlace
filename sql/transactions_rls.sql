-- CampusMarketPlace transactions security setup
-- Run this script in the Supabase SQL Editor for the transactions table.

begin;

alter table public.transactions enable row level security;

grant select, insert, update on table public.transactions to authenticated;

-- Users can read their own transactions as buyer or seller.
drop policy if exists "transactions_select_own_rows" on public.transactions;
create policy "transactions_select_own_rows"
  on public.transactions
  for select
  to authenticated
  using (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
  );

-- Buyers may create transactions for themselves.
drop policy if exists "transactions_insert_by_buyer" on public.transactions;
create policy "transactions_insert_by_buyer"
  on public.transactions
  for insert
  to authenticated
  with check (
    auth.uid() = buyer_id
  );

-- Allow buyers/sellers to update transaction status fields on rows they own.
drop policy if exists "transactions_update_own_rows" on public.transactions;
create policy "transactions_update_own_rows"
  on public.transactions
  for update
  to authenticated
  using (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
  )
  with check (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
  );

-- Prevent authenticated users from deleting transactions directly.
drop policy if exists "transactions_no_delete_for_users" on public.transactions;
create policy "transactions_no_delete_for_users"
  on public.transactions
  for delete
  to authenticated
  using (false);

commit;
