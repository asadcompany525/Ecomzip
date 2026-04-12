-- Add is_deleted, username, and staff_role columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS staff_role text;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS profiles_is_deleted_idx ON public.profiles(is_deleted);

-- Policy: Moderators (staff) can also view non-deleted profiles (for customer management)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Moderators can view active profiles'
  ) THEN
    CREATE POLICY "Moderators can view active profiles"
      ON public.profiles FOR SELECT
      USING (
        public.has_role(auth.uid(), 'moderator') AND
        (is_deleted IS NULL OR is_deleted = false)
      );
  END IF;
END $$;

-- Policy: Admins can soft-delete profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can update all profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles"
      ON public.profiles FOR UPDATE
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
