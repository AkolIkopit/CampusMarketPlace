
# CampusSwap — Campus Marketplace

[![codecov](https://codecov.io/gh/AkolIkopit/CampusMarketPlace/graph/badge.svg?token=P53OBVYJ3Z)](https://codecov.io/gh/AkolIkopit/CampusMarketPlace)

A student-only peer-to-peer trading platform for university campuses.

## Tech Stack
- React 18 + JavaScript
- Create React App
- React Router v6
- Supabase (auth + database)

## Messaging Setup (Supabase)
- Run [sql/messages_rls.sql](sql/messages_rls.sql) in the Supabase SQL Editor.
- The script enables RLS, creates safe policies for select/insert/read-receipt updates, adds helpful indexes, and ensures realtime publication for `messages`.
- The script also adds `attachment_url` so message uploads can be stored from the Add button.
- Make sure the `message-attachments` storage bucket exists and the upload policy is set for authenticated users.
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
