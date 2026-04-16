-- =============================================
-- 1. CONTACT MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact message
DROP POLICY IF EXISTS "Anyone can submit contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact message"
  ON public.contact_messages FOR INSERT TO public
  WITH CHECK (true);

-- Admins can read and manage all contact messages
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;
CREATE POLICY "Admins can manage contact messages"
  ON public.contact_messages FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Moderators (staff) can read contact messages
DROP POLICY IF EXISTS "Moderators can view contact messages" ON public.contact_messages;
CREATE POLICY "Moderators can view contact messages"
  ON public.contact_messages FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- =============================================
-- 2. FIX RLS: PROFILES — Admin Full Bypass
-- =============================================
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Moderators can view profiles" ON public.profiles;
CREATE POLICY "Moderators can view profiles"
  ON public.profiles FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- =============================================
-- 3. FIX RLS: SITE_SETTINGS — Admin Full Bypass
-- =============================================
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage site_settings" ON public.site_settings;
CREATE POLICY "Admins can manage site_settings"
  ON public.site_settings FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can read site_settings" ON public.site_settings;
CREATE POLICY "Anyone can read site_settings"
  ON public.site_settings FOR SELECT TO public
  USING (true);

-- =============================================
-- 4. FIX RLS: PRODUCTS — Admin Full Bypass + Moderator Manage
-- =============================================
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Moderators can manage products" ON public.products;
CREATE POLICY "Moderators can manage products"
  ON public.products FOR ALL TO public
  USING (public.has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT TO public
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- =============================================
-- 5. USER_ROLES — Allow admins full access + Allow user to see own roles
-- =============================================
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Moderators can view roles" ON public.user_roles;
CREATE POLICY "Moderators can view roles"
  ON public.user_roles FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'moderator'::app_role));

-- =============================================
-- 6. DEVELOPER_TECH_STACK and DEVELOPER_SERVICES as site_settings rows
-- (These are stored as JSON in site_settings with keys: developer_tech_stack, developer_services)
-- Ensure default values exist
-- =============================================
INSERT INTO public.site_settings (key, value)
VALUES (
  'developer_tech_stack',
  '["React","TypeScript","Node.js","Supabase","Tailwind CSS","Next.js","React Native","PostgreSQL","OpenAI","Framer Motion"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES (
  'developer_services',
  '[{"label":"E-Commerce Development","desc":"Full-stack storefronts with AI & real-time features"},{"label":"Mobile App Development","desc":"React Native & Expo cross-platform apps"},{"label":"AI Integration","desc":"LLM-powered chatbots, automation & analytics"},{"label":"Cloud & Backend","desc":"Supabase, Firebase, Node.js scalable APIs"},{"label":"UI/UX Design","desc":"Pixel-perfect, mobile-first interfaces"}]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
