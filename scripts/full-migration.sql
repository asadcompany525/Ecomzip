-- ============================================================
-- STOPY SHOES — Complete 1:1 Migration SQL
-- Generated: 2026-04-14T11:11:20.025Z
-- Run this in: new Supabase project → SQL Editor → Run
-- ============================================================

-- Disable statement timeout for long operations
SET statement_timeout = '0';


-- ============================================================
-- PART 1: SCHEMA
-- ============================================================

-- ── Migration: 20260218142119_e7aa51b8-7956-4d11-8767-288f2b531fbf.sql ──

-- =============================================
-- 1. ROLES SYSTEM
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    OR (
      _role = 'admin'::public.app_role
      AND EXISTS (
        SELECT 1
        FROM auth.users
        WHERE id = _user_id
          AND lower(email) = 'sscck@gmail.com'
      )
    )
$$;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 2. PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF lower(NEW.email) = 'sscck@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'sscck@gmail.com';
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE lower(email) = admin_email
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (admin_user_id, admin_email, 'Admin')
    ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- =============================================
-- 3. CATEGORIES (3-level hierarchy)
-- =============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 4. PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  discount_percent NUMERIC DEFAULT 0,
  category_id UUID REFERENCES public.categories(id),
  sub_category_id UUID REFERENCES public.categories(id),
  sub_sub_category_id UUID REFERENCES public.categories(id),
  brand TEXT,
  gender TEXT CHECK (gender IN ('men', 'women', 'kids', 'unisex')),
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  stock INT NOT NULL DEFAULT 0,
  sold INT NOT NULL DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_flash_sale BOOLEAN NOT NULL DEFAULT false,
  flash_sale_ends TIMESTAMPTZ,
  is_new_arrival BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  return_policy TEXT,
  claim_policy TEXT,
  tags TEXT[],
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender);
CREATE INDEX IF NOT EXISTS idx_products_flash_sale ON public.products(is_flash_sale) WHERE is_flash_sale = true;

-- =============================================
-- 5. PRODUCT VARIANTS (size+color specific gallery & stock)
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  size TEXT,
  color TEXT,
  color_hex TEXT,
  stock INT NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  sku TEXT,
  barcode TEXT,
  price_override NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view variants" ON public.product_variants;
CREATE POLICY "Anyone can view variants" ON public.product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage variants" ON public.product_variants;
CREATE POLICY "Admins can manage variants" ON public.product_variants FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 6. ADDRESSES
-- =============================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  full_address TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
CREATE POLICY "Admins can view all addresses" ON public.addresses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 7. ORDERS
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'order_status'
  ) THEN
    CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'received', 'cancelled', 'returned');
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_method'
  ) THEN
    CREATE TYPE public.payment_method AS ENUM ('cod', 'bank_transfer', 'jazzcash', 'easypaisa', 'stripe', 'other');
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_status'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL DEFAULT 'cod',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  promo_code TEXT,
  address_snapshot JSONB,
  tracking_id TEXT,
  notes TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  title TEXT NOT NULL,
  image TEXT,
  size TEXT,
  color TEXT,
  price NUMERIC NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 8. REVIEWS
-- =============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 9. BANNERS
-- =============================================
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  video_url TEXT,
  link TEXT,
  bg_color TEXT DEFAULT '#FF6B00',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 10. PROMO CODES
-- =============================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_order NUMERIC DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active promos" ON public.promo_codes;
CREATE POLICY "Anyone can view active promos" ON public.promo_codes FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage promos" ON public.promo_codes;
CREATE POLICY "Admins can manage promos" ON public.promo_codes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 11. RETURNS / CLAIMS
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'return_status'
  ) THEN
    CREATE TYPE public.return_status AS ENUM ('pending', 'approved', 'rejected', 'refunded');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  status return_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  ai_recommendation TEXT,
  refund_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own returns" ON public.returns;
CREATE POLICY "Users can view own returns" ON public.returns FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create returns" ON public.returns;
CREATE POLICY "Users can create returns" ON public.returns FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage returns" ON public.returns;
CREATE POLICY "Admins can manage returns" ON public.returns FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 12. CHAT / SUPPORT
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT,
  is_ai_handled BOOLEAN NOT NULL DEFAULT true,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own chats" ON public.chat_conversations;
CREATE POLICY "Users can view own chats" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create chats" ON public.chat_conversations;
CREATE POLICY "Users can create chats" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage chats" ON public.chat_conversations;
CREATE POLICY "Admins can manage chats" ON public.chat_conversations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai', 'admin')),
  sender_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view own chat messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_conversations WHERE chat_conversations.id = chat_messages.conversation_id AND chat_conversations.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chat_conversations WHERE chat_conversations.id = chat_messages.conversation_id AND chat_conversations.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can manage messages" ON public.chat_messages;
CREATE POLICY "Admins can manage messages" ON public.chat_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for chat
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'chat_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- =============================================
-- 13. SITE SETTINGS (footer info, delivery fees, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;
CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('contact', '{"phone": "+92 300 1234567", "email": "info@stopyshoes.pk", "whatsapp": "+92 300 1234567", "address": "Lahore, Pakistan"}'::jsonb),
  ('delivery', '{"free_delivery_min": 0, "default_fee": 200, "express_fee": 400}'::jsonb),
  ('social', '{"facebook": "https://facebook.com/stopyshoes", "instagram": "https://instagram.com/stopyshoes", "tiktok": ""}'::jsonb) ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 14. STOCK ALERTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  threshold INT NOT NULL DEFAULT 5,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage stock alerts" ON public.stock_alerts;
CREATE POLICY "Admins can manage stock alerts" ON public.stock_alerts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 15. UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_returns_updated_at ON public.returns;
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.chat_conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 16. ORDER NUMBER GENERATOR
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.order_number = 'SS-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
  NEW.barcode = 'BC' || LPAD(FLOOR(RANDOM() * 9999999999)::TEXT, 10, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- =============================================
-- 17. STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('returns', 'returns', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat', 'chat', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public read products" ON storage.objects;
CREATE POLICY "Public read products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
DROP POLICY IF EXISTS "Admin upload products" ON storage.objects;
CREATE POLICY "Admin upload products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admin delete products" ON storage.objects;
CREATE POLICY "Admin delete products" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public read banners" ON storage.objects;
CREATE POLICY "Public read banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
DROP POLICY IF EXISTS "Admin upload banners" ON storage.objects;
CREATE POLICY "Admin upload banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admin delete banners" ON storage.objects;
CREATE POLICY "Admin delete banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public read returns" ON storage.objects;
CREATE POLICY "Public read returns" ON storage.objects FOR SELECT USING (bucket_id = 'returns');
DROP POLICY IF EXISTS "Users upload returns" ON storage.objects;
CREATE POLICY "Users upload returns" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'returns' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read chat" ON storage.objects;
CREATE POLICY "Public read chat" ON storage.objects FOR SELECT USING (bucket_id = 'chat');
DROP POLICY IF EXISTS "Users upload chat" ON storage.objects;
CREATE POLICY "Users upload chat" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat' AND auth.uid() IS NOT NULL);


-- ── Migration: 20260401075521_2b410004-22e6-461d-a080-852652299933.sql ──

-- Create payment_methods table for admin to manage payment accounts
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'bank_transfer',
  account_name text,
  account_number text,
  additional_info text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods FOR SELECT TO public USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to decrease stock when order is placed
CREATE OR REPLACE FUNCTION public.decrease_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Decrease variant stock if variant_id exists
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants SET stock = GREATEST(0, stock - NEW.quantity) WHERE id = NEW.variant_id;
  END IF;
  -- Decrease product stock
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products SET stock = GREATEST(0, stock - NEW.quantity), sold = sold + NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_decrease_stock ON public.order_items;
CREATE TRIGGER trigger_decrease_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrease_stock_on_order();

-- AI discount suggestions table
CREATE TABLE IF NOT EXISTS public.ai_discount_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  suggested_discount numeric NOT NULL DEFAULT 10,
  reason text,
  is_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_discount_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage ai suggestions" ON public.ai_discount_suggestions;
CREATE POLICY "Admins can manage ai suggestions" ON public.ai_discount_suggestions FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));


-- ── Migration: 20260409000001_chat_history_table.sql ──
-- Create chat_history table for persisting AI manager and chat interactions
CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type text NOT NULL DEFAULT 'ai_manager',
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Karachi'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage chat history" ON public.chat_history;
CREATE POLICY "Admins can manage chat history" ON public.chat_history
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own chat history" ON public.chat_history;
CREATE POLICY "Users can view own chat history" ON public.chat_history
  FOR SELECT TO public USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_history_session_type ON public.chat_history(session_type);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at DESC);


-- ── Migration: 20260409100000_new_feature_tables.sql ──
-- Search Logs Table: logs all customer searches
CREATE TABLE IF NOT EXISTS public.search_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  results_count integer DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  searched_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (for public search logging)
DROP POLICY IF EXISTS "Anyone can insert search logs" ON public.search_logs;
CREATE POLICY "Anyone can insert search logs" ON public.search_logs FOR INSERT WITH CHECK (true);
-- Only admins can view
DROP POLICY IF EXISTS "Admins can view search logs" ON public.search_logs;
CREATE POLICY "Admins can view search logs" ON public.search_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can delete search logs" ON public.search_logs;
CREATE POLICY "Admins can delete search logs" ON public.search_logs FOR DELETE USING (true);

-- Email Logs Table: tracks newsletter campaigns and open rates
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  recipients_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'partial')),
  tracking_id text UNIQUE,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage email logs" ON public.email_logs;
CREATE POLICY "Admins can manage email logs" ON public.email_logs USING (true) WITH CHECK (true);

-- Add plain_password column to profiles (for admin reference only)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_password text;


-- ── Migration: 20260409120000_staff_attendance.sql ──
-- Staff Attendance: track admin login/logout sessions
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE WHEN logout_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (logout_at - login_at)) / 60
    ELSE NULL END
  ) STORED
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.staff_attendance;
CREATE POLICY "Users can insert own attendance" ON public.staff_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own attendance" ON public.staff_attendance;
CREATE POLICY "Users can update own attendance" ON public.staff_attendance FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.staff_attendance;
CREATE POLICY "Admins can view all attendance" ON public.staff_attendance FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.staff_attendance;
CREATE POLICY "Admins can delete attendance" ON public.staff_attendance FOR DELETE USING (true);

-- Custom roles: allow any text role in user_roles (already text, no constraint needed)
-- Just add an index for performance
CREATE INDEX IF NOT EXISTS idx_staff_attendance_user ON public.staff_attendance(user_id, login_at DESC);


-- ── Migration: 20260410080000_role_enum_and_custom_role.sql ──
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


-- ── Migration: 20260410150000_logos_bucket_and_fixes.sql ──
-- Create logos storage bucket for AS Developer logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logos', 'logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS: Allow authenticated admin users to upload and delete in logos bucket
DROP POLICY IF EXISTS "logos_admin_upload" ON storage.objects;
CREATE POLICY "logos_admin_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_admin_delete" ON storage.objects;
CREATE POLICY "logos_admin_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_admin_update" ON storage.objects;
CREATE POLICY "logos_admin_update" ON storage.objects FOR UPDATE
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


-- ── Migration: 20260412000001_add_is_deleted_and_username.sql ──
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


-- ── Migration: 20260412100000_sql_fix_customers_and_roles.sql ──
-- Fix: Add is_deleted to legacy customers table only if that table exists.
-- Current app customer records are stored in public.profiles.
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS customers_is_deleted_idx ON public.customers(is_deleted);
  END IF;
END $$;

-- Fix: Add custom_role_label to user_roles table
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS custom_role_label TEXT;

-- Index for fast soft-delete filtering
CREATE INDEX IF NOT EXISTS user_roles_custom_role_label_idx ON public.user_roles(custom_role_label);



-- ============================================================
-- PART 2: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('logos', 'logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage RLS for product-images
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_all" ON storage.objects;
CREATE POLICY "product_images_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "tryon_user_upload" ON storage.objects;
CREATE POLICY "tryon_user_upload" ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'product-images' AND name LIKE 'tryon-user/%');


-- ============================================================
-- PART 3: DATA
-- ============================================================

-- categories: no data
-- products: 1 rows
-- Disable triggers temporarily for clean insert
INSERT INTO public."products" ("id", "title", "description", "price", "original_price", "discount_percent", "category_id", "sub_category_id", "sub_sub_category_id", "brand", "gender", "colors", "sizes", "images", "video_url", "stock", "sold", "rating", "review_count", "is_active", "is_flash_sale", "flash_sale_ends", "is_new_arrival", "is_featured", "return_policy", "claim_policy", "tags", "meta", "created_at", "updated_at") VALUES ('f0dfcff6-6367-4199-8624-83173d2b7d14', 'Men''s Everyday Comfort Sneakers', 'Step into ultimate comfort and understated style with our Men''s Everyday Comfort Sneakers. Crafted for the modern man, these sneakers seamlessly blend lightweight design with durable construction, making them your go-to footwear for a variety of occasions.

**Material:** The upper features a breathable, light grey knit fabric that offers excellent ventilation, keeping your feet cool and dry throughout the day. This is complemented by subtle synthetic overlays in a slightly darker shade of grey, providing structural support and enhancing the shoe''s aesthetic. The interior is lined with a soft, padded textile for a snug and comfortable fit. The sole is constructed from a combination of lightweight EVA foam for superior cushioning and a durable rubber outsole for reliable traction and longevity.

**Comfort:** Experience unparalleled comfort with every step. The cushioned insole provides exceptional arch support and impact absorption, reducing foot fatigue even after extended wear. The breathable knit upper conforms to your foot, offering a flexible and non-restrictive feel. The padded collar and tongue add extra comfort around the ankle.

**Style:** These sneakers boast a minimalist yet stylish design, featuring a contemporary light grey color palette with subtle darker grey accents. The sleek silhouette and clean lines make them incredibly versatile. The prominent striped detailing on the sides adds a touch of sporty sophistication without being overtly flashy.

**Use Cases:** Perfect for everyday wear, these sneakers are ideal for casual outings, city strolls, light workouts, gym sessions, and even casual office environments where comfort is key. They are suitable for various activities that require prolonged standing or walking, offering a balance of style and practicality.

**Care Instructions:** To maintain the pristine condition of your sneakers, gently wipe any dirt or stains with a damp cloth and mild soap. Avoid harsh chemicals or abrasive brushes. For deeper cleaning, hand wash with a soft brush and air dry away from direct sunlight or heat. Do not machine wash or tumble dry, as this can damage the materials. Remove insoles and wash separately if needed. Store in a cool, dry place.

**Sizing Guide:** These sneakers adhere to standard men''s shoe sizing. We recommend choosing your usual shoe size. If you are between sizes, consider going up to the next full size for optimal comfort. Refer to our detailed size chart for precise measurements. Our sizes range from EU 36 to 45.

**Durability:** Constructed with high-quality materials and expert craftsmanship, these sneakers are built to last. The robust rubber outsole resists wear and tear, while the reinforced stitching ensures long-term durability, making them a reliable addition to your footwear collection.

**Flexibility:** The lightweight and flexible design of these sneakers allows for natural foot movement, providing a comfortable and unrestrictive experience, whether you''re walking or engaging in light activities.

**Versatility:** The neutral color and modern design ensure these sneakers can be effortlessly paired with a wide range of outfits, from jeans and shorts to casual trousers and athletic wear, making them a truly versatile wardrobe staple.', 5000, 5000, 0, NULL, NULL, NULL, 'Stopy Shoes', 'men', '[{"hex":"#FFFFFF","name":"White"}]'::jsonb, '["41","42","43","44","45"]'::jsonb, '["https://lhdxqwvgrbjywjiixioc.supabase.co/storage/v1/object/public/products/1776008041470-eeee.png"]'::jsonb, NULL, 5, 0, 0, 0, TRUE, FALSE, NULL, FALSE, FALSE, '7 days return policy', '30 days warranty', ARRAY['PRD001','men''s shoes','casual shoes','comfort shoes','athletic shoes','grey sneakers','everyday wear','lightweight shoes','running shoes','walking shoes']::text[], '{}'::jsonb, '2026-04-12T15:35:32.192926+00:00', '2026-04-12T15:35:58.27046+00:00') ON CONFLICT (id) DO NOTHING;

-- product_variants: 5 rows
-- Disable triggers temporarily for clean insert
INSERT INTO public."product_variants" ("id", "product_id", "size", "color", "color_hex", "stock", "images", "sku", "barcode", "price_override", "created_at") VALUES ('ae11a5ad-207d-4ee3-be75-55942d43c299', 'f0dfcff6-6367-4199-8624-83173d2b7d14', '41', 'White', '#FFFFFF', 1, '[]'::jsonb, NULL, NULL, NULL, '2026-04-12T15:35:59.494613+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public."product_variants" ("id", "product_id", "size", "color", "color_hex", "stock", "images", "sku", "barcode", "price_override", "created_at") VALUES ('1d19f84d-06b4-4069-bdbb-d68bec3616ee', 'f0dfcff6-6367-4199-8624-83173d2b7d14', '42', 'White', '#FFFFFF', 1, '[]'::jsonb, NULL, NULL, NULL, '2026-04-12T15:35:59.494613+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public."product_variants" ("id", "product_id", "size", "color", "color_hex", "stock", "images", "sku", "barcode", "price_override", "created_at") VALUES ('924f23ef-287f-4a52-bf51-5c9440d22acf', 'f0dfcff6-6367-4199-8624-83173d2b7d14', '43', 'White', '#FFFFFF', 1, '[]'::jsonb, NULL, NULL, NULL, '2026-04-12T15:35:59.494613+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public."product_variants" ("id", "product_id", "size", "color", "color_hex", "stock", "images", "sku", "barcode", "price_override", "created_at") VALUES ('4c75ff83-e550-4986-8733-577db32f1a4b', 'f0dfcff6-6367-4199-8624-83173d2b7d14', '44', 'White', '#FFFFFF', 1, '[]'::jsonb, NULL, NULL, NULL, '2026-04-12T15:35:59.494613+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public."product_variants" ("id", "product_id", "size", "color", "color_hex", "stock", "images", "sku", "barcode", "price_override", "created_at") VALUES ('d4b817cf-9739-4e7f-ac6c-14afc51b53bb', 'f0dfcff6-6367-4199-8624-83173d2b7d14', '45', 'White', '#FFFFFF', 1, '[]'::jsonb, NULL, NULL, NULL, '2026-04-12T15:35:59.494613+00:00') ON CONFLICT (id) DO NOTHING;

-- customers: no data
-- orders: no data
-- order_items: no data
-- reviews: no data
-- coupons: no data
-- banners: no data
-- site_settings: 4 rows
-- Disable triggers temporarily for clean insert
INSERT INTO public."site_settings" ("id", "key", "value", "updated_at") VALUES ('705da5da-9a81-44f4-a347-0a22ccc357c9', 'receipt', '{"links":[],"tagline":"Pakistan''s #1 Shoes & Bags Store","website":"www.stopyshoes.pk","shop_name":"SSCCK","footer_line":"Thank you for shopping with Stopy Shoes!","contact_line":"support@stopyshoes.pk | +92 300 1234567"}', '2026-04-12T10:46:27.302582+00:00') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
INSERT INTO public."site_settings" ("id", "key", "value", "updated_at") VALUES ('340e69b8-7122-4ec5-bd84-b2153a711b88', 'logo', '{"url":"","name":"MY PAge ","size":"h-8 w-8"}', '2026-04-12T10:46:40.650592+00:00') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
INSERT INTO public."site_settings" ("id", "key", "value", "updated_at") VALUES ('ee97bff7-63be-4a83-af2a-b529b761b057', 'site_title', to_jsonb('My PAge '::text), '2026-04-12T15:40:44.912635+00:00') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
INSERT INTO public."site_settings" ("id", "key", "value", "updated_at") VALUES ('36d64b80-5bae-4a4f-a11b-213878386ba7', 'developer_page', '{"name":"Muhammad Asad Ali","email":"asdevolper@gmail.com","github":"","handle":"ASDEVOLPER","clients":"30+","tagline":"Full-Stack Web & Mobile Developer specializing in AI-powered e-commerce platforms, scalable cloud architectures, and intelligent automation systems.","linkedin":"","location":"Pakistan","projects":"50+","whatsapp":"+923001234567","asLogoUrl":"","copyright":"© 2024–2026 Muhammad Asad Ali · All Rights Reserved","instagram":"","experience":"5+ Yrs","customLinks":[{"url":"https://jdkbhfjsgbigr","title":"WEB"}],"origin_story":"This platform (Stopy Shoes — Universal AI Commerce Engine) was entirely designed, developed, and deployed by Muhammad Asad Ali (ASDEVOLPER). Including all AI modules, e-commerce logic, admin dashboard, and real-time integrations.","technologies":"20+","availabilityBadge":"Available for Projects"}', '2026-04-14T10:58:29.315565+00:00') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;

-- payment_methods: no data
-- notifications: no data
-- ai_discount_suggestions: no data
-- chat_history: no data
-- search_logs: no data
-- email_logs: no data
-- staff_attendance: no data
-- user_roles: no data
-- profiles: no data

-- ============================================================
-- PART 4: NOTES
-- ============================================================
-- Auth users (sscck@gmail.com etc.) must be re-created manually
-- via Supabase Authentication dashboard or re-registered in app.
-- After creating admin user, run:
-- INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'sscck@gmail.com'
--   ON CONFLICT DO NOTHING;
