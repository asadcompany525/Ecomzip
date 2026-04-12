-- Fix: Add is_deleted to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Fix: Add custom_role_label to user_roles table
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS custom_role_label TEXT;

-- Index for fast soft-delete filtering
CREATE INDEX IF NOT EXISTS customers_is_deleted_idx ON public.customers(is_deleted);
CREATE INDEX IF NOT EXISTS user_roles_custom_role_label_idx ON public.user_roles(custom_role_label);
