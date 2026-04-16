
# CampusSwap — Campus Marketplace

A student-only peer-to-peer trading platform for university campuses.

## Tech Stack
- React 18 + TypeScript
- Create React App
- React Router v6
- Supabase (auth + database)

## Messaging Setup (Supabase)
- Run [sql/messages_rls.sql](sql/messages_rls.sql) in the Supabase SQL Editor.
- The script enables RLS, creates safe policies for select/insert/read-receipt updates, adds helpful indexes, and ensures realtime publication for `messages`.
## Group Members
- Olwethu Phiri
- Ethan Ikopit
- Haseeb Kabir
- Andre Mekraju
- Thato Khoza

## Roles
- **Student** — Can list items, browse, buy, and trade
- **Trade Facility Staff** — Manages drop-off/collection bookings
- **Admin** — Platform management and moderation
