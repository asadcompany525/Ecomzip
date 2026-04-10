-- Create logos storage bucket for AS Developer logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logos', 'logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS: Allow authenticated admin users to upload and delete in logos bucket
DROP POLICY IF EXISTS "logos_admin_upload" ON storage.objects;
CREATE POLICY "logos_admin_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_admin_delete" ON storage.objects;
CREATE POLICY "logos_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_admin_update" ON storage.objects;
CREATE POLICY "logos_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos');

-- Expand app_role enum (safe – adds missing values only)
DO $$ BEGIN
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'delivery'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'editor'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'viewer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'moderator'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'sales'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'accountant'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'dispatcher'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Add custom_role_label column for free-text role names
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS custom_role_label text;

-- Add plain_password to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plain_password text;
