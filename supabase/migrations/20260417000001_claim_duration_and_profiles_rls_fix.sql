-- =============================================
-- 1. ADD claim_duration COLUMN TO PRODUCTS
-- Fixes 'Product save failed' error from missing column
-- =============================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS claim_duration integer DEFAULT 7;

COMMENT ON COLUMN public.products.claim_duration IS 'Number of days allowed for warranty/return claims on this product';

-- =============================================
-- 2. FIX PROFILES RLS — Allow Admin to INSERT new staff profiles
-- The service_role (trigger) already bypasses RLS.
-- This also ensures admin can manually insert profiles for new staff.
-- =============================================

-- Drop conflicting insert-only policy that restricts INSERT to own user_id
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate safe version: users can only insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure the "Admins can manage all profiles" covers INSERT explicitly
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow service role (triggers, server-side) to insert profiles freely
-- Service role already bypasses RLS by default in Supabase, no change needed there.

-- =============================================
-- 3. REFRESH SCHEMA CACHE (force PostgREST to reload)
-- =============================================
NOTIFY pgrst, 'reload schema';
