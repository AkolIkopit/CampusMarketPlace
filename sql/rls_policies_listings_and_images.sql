-- RLS policies for listings and listing_images
-- Run these in the Supabase SQL editor (Database -> SQL editor)

-- 1) Enable RLS on the tables (only if not already enabled)
ALTER TABLE IF EXISTS public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listing_images ENABLE ROW LEVEL SECURITY;

-- 2) Policies for `listings` -------------------------------------------------
-- Allow owners to SELECT their listings
CREATE POLICY IF NOT EXISTS "Owners can select listings"
  ON public.listings
  FOR SELECT
  USING (auth.uid() = seller_id::text);

-- Allow any authenticated user to INSERT a listing where seller_id = auth.uid()
CREATE POLICY IF NOT EXISTS "Authenticated can insert listing with their id"
  ON public.listings
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id::text);

-- Allow owners to UPDATE their listing (only when seller_id matches)
CREATE POLICY IF NOT EXISTS "Owners can update own listings"
  ON public.listings
  FOR UPDATE
  USING (auth.uid() = seller_id::text)
  WITH CHECK (auth.uid() = seller_id::text);

-- Allow owners to DELETE their listing
CREATE POLICY IF NOT EXISTS "Owners can delete own listings"
  ON public.listings
  FOR DELETE
  USING (auth.uid() = seller_id::text);

-- OPTIONAL: If you want public browsing (e.g., marketplace), add a read policy for everyone
-- CREATE POLICY IF NOT EXISTS "Public read listings"
--   ON public.listings
--   FOR SELECT
--   USING (true);

-- 3) Policies for `listing_images` -------------------------------------------
-- Ensure users can only operate on images that belong to listings they own.

-- Allow owners to SELECT images tied to their listings
CREATE POLICY IF NOT EXISTS "Owners can select their listing images"
  ON public.listing_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id
        AND l.seller_id::text = auth.uid()
    )
  );

-- Allow owners to INSERT images for listings they own
CREATE POLICY IF NOT_EXISTS "Owners can insert images for their listing"
  ON public.listing_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id
        AND l.seller_id::text = auth.uid()
    )
  );

-- Allow owners to UPDATE images for listings they own
CREATE POLICY IF NOT EXISTS "Owners can update their listing images"
  ON public.listing_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id
        AND l.seller_id::text = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id
        AND l.seller_id::text = auth.uid()
    )
  );

-- Allow owners to DELETE images for listings they own
CREATE POLICY IF NOT EXISTS "Owners can delete their listing images"
  ON public.listing_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id
        AND l.seller_id::text = auth.uid()
    )
  );

-- 4) Notes:
-- - If `seller_id` is a UUID type, the cast to text (seller_id::text) is necessary
--   to compare with auth.uid() which is a text JWT subject.
-- - If you already have policies with different names, consider adapting them
--   rather than creating duplicates.
-- - After running, test the edit flow. The PATCH response should include the
--   updated row(s) (not an empty array) when allowed.

-- END
