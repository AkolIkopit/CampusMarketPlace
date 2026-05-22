# CampusSwap — Campus Marketplace

[![codecov](https://codecov.io/gh/AkolIkopit/CampusMarketPlace/branch/main/graph/badge.svg?token=P53OBVYJ3Z)](https://codecov.io/gh/AkolIkopit/CampusMarketPlace)

A student-only peer-to-peer trading platform for university campuses.

## Tech Stack
- React 18 + JavaScript
- Create React App
- React Router v6
- Supabase (auth + database)

## Local Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/AkolIkopit/CampusMarketPlace.git
   cd CampusMarketPlace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:
     ```
     REACT_APP_SUPABASE_URL=your_supabase_url
     REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run the development server**
   ```bash
   npm start
   ```
   - The app will open at `http://localhost:3000`

5. **Build for production**
   ```bash
   npm run build
   ```

## Messaging Setup (Supabase)
- Run [sql/messages_rls.sql](sql/messages_rls.sql) in the Supabase SQL Editor.
- The script enables RLS, creates safe policies for select/insert/read-receipt updates, adds helpful indexes, and ensures realtime publication for `messages`.
- The script also adds `attachment_url` so message uploads can be stored from the Add button.
- Make sure the `message-attachments` storage bucket exists and the upload policy is set for authenticated users.

## Navigation Guide

### Main Features
- **Home** — Browse available items and listings
- **List Item** — Post a new item for sale or trade
- **My Items** — View and manage your posted items
- **Messages** — Chat with other users about items
- **Profile** — Manage account settings and user information
- **Bookings** (Staff/Admin) — Manage drop-off and collection bookings

### User Roles
- **Student** — Can list items, browse, buy, and trade
- **Trade Facility Staff** — Manages drop-off/collection bookings
- **Admin** — Platform management and moderation

## Group Members
- Olwethu Phiri
- Ethan Ikopit
- Haseeb Kabir
- Andre Mekraju
- Thato Khoza
