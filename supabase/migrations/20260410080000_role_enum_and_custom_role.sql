-- Add new values to the app_role enum
DO $$ BEGIN
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'delivery'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'editor'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'viewer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'sales'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'accountant'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'dispatcher'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Add custom_role_label column to user_roles for free-text custom roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS custom_role_label text;

-- Add plain_password column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plain_password text;
