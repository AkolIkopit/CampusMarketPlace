-- CampusMarketPlace messaging security/realtime setup
-- Run in Supabase SQL Editor.

begin;

-- Ensure the table is governed by RLS.
alter table public.messages enable row level security;

-- Helpful indexes for inbox/thread queries.
alter table public.messages
  add column if not exists attachment_url text;

create index if not exists idx_messages_sender_created_at
  on public.messages (sender_id, created_at desc);

create index if not exists idx_messages_receiver_created_at
  on public.messages (receiver_id, created_at desc);

create index if not exists idx_messages_listing_created_at
  on public.messages (listing_id, created_at desc);

-- Grant table privileges to authenticated users.
-- RLS policies below still control exactly which rows they can touch.
grant select, insert, update on table public.messages to authenticated;

-- Recreate policies to keep this script idempotent.
drop policy if exists "messages_select_own_threads" on public.messages;
create policy "messages_select_own_threads"
  on public.messages
  for select
  to authenticated
  using (
    -- Users can read only rows where they are sender or receiver.
    auth.uid() = sender_id
    or auth.uid() = receiver_id
  );

drop policy if exists "messages_insert_as_sender" on public.messages;
create policy "messages_insert_as_sender"
  on public.messages
  for insert
  to authenticated
  with check (
    -- Prevent spoofing: caller must be the sender.
    auth.uid() = sender_id
    and receiver_id is not null
    -- Basic guard against blank chat rows.
    and message_text is not null
    and length(btrim(message_text)) > 0
  );

drop policy if exists "messages_update_read_receipt" on public.messages;
create policy "messages_update_read_receipt"
  on public.messages
  for update
  to authenticated
  using (
    -- Receiver can update rows they received (e.g., set is_read=true).
    auth.uid() = receiver_id
  )
  with check (
    auth.uid() = receiver_id
  );

-- Optional hardening: only service role can delete rows.
drop policy if exists "messages_no_delete_for_users" on public.messages;
create policy "messages_no_delete_for_users"
  on public.messages
  for delete
  to authenticated
  using (false);

-- Ensure realtime can stream changes from this table.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

commit;
