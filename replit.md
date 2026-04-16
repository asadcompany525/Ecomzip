# Stopy Shoes

A React 18 + Vite + Supabase e-commerce storefront for a Pakistani shoes and bags store — Pakistan's #1 Shoes & Bags Store.

## Recent Changes (April 2026)
- **Smart Staff Upsert**: AdminStaff.tsx now checks if email exists before creating. If exists → updates role + password. If new → creates account.
- **RLS Fixes**: Migration `20260416000001_contact_rls_developer_fixes.sql` adds admin full-bypass policies for profiles, site_settings, products tables + moderator read policies.
- **contact_messages table**: Created with RLS (anyone can insert, admins/moderators can read).
- **Developer Page dynamic content**: Tech Stack and Services now loaded from `site_settings` DB keys `developer_tech_stack` and `developer_services`. Editable from Admin → Settings → Pages tab.
- **ProductDetail crash-proofing**: fetchProduct wrapped in try/catch with Promise.allSettled, all field null-guarded. Also loading state guaranteed to clear via `finally` block.

## Role-Based Access Control (RBAC)

- **Regular Users**: Never see any dashboard or admin links. Pure e-commerce experience.
- **Staff (moderator role)**: See "Enter Panel" button in My Page. Access only permitted pages inside the dashboard. Blocked pages show "No Access" screen. Header shows "Logged in as: [Role]".
- **Admin (sscck@gmail.com)**: Full access to all admin pages, staff management, AI tools, settings.
- Admin login accepts `sscck@gmail.com` with password `sscck@gmail.com`; the app maps that to the current Supabase Auth password `sscck123` to create a real database-backed session, with local fallback only for Supabase Auth outages.

### Staff Permissions
- Permissions stored in `localStorage` key `staff_permissions_v3` (indexed by user_roles.id)
- Role labels stored in `localStorage` key `staff_roles_v3`
- Default permissions per role defined in `AdminStaff.tsx:DEFAULT_PERMS`
- Path-to-permission map in `AdminLayout.tsx:PATH_TO_PERM`

### Session Logging
- `staff_attendance` table records login_at/logout_at for every panel session
- AdminLayout auto-records login on mount and logout on window close
- AdminStaff "Attendance Logs" tab shows last 20 sessions per staff member

### Chat Watch
- AdminChat has a "Chat Watch" bar (admin only) to filter conversations by staff member
- chat_messages.sender_id is populated when staff/admin sends a reply

## Architecture

- **Frontend**: React 18, TypeScript, Vite (port 5000)
- **Styling**: Tailwind CSS, shadcn/ui component library
- **Routing**: React Router DOM v6
- **State**: React Query (TanStack), React Context (Auth, Cart, Language)
- **Backend**: Supabase (auth, database, storage, edge functions)
- **Charts**: Recharts
- **Animations**: Framer Motion

## Project Structure

- `src/pages/` — All page-level components (storefront + admin panel)
- `src/pages/admin/` — Admin panel pages (products, orders, AI features, settings)
- `src/components/` — Reusable UI components (layout, home, admin, chat)
- `src/contexts/` — React contexts (AuthContext, CartContext, LanguageContext)
- `src/integrations/supabase/` — Supabase client and generated types
- `src/data/` — Static demo data
- `supabase/functions/` — Supabase Edge Functions (admin-login, ai-assistant)

## Environment Variables

Set in `.env`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

## Running the App

```bash
npm run dev
```

Starts the Vite dev server on port 5000.

## Key Features

### Storefront
- Mobile-first responsive design with bottom navigation
- Hero banner slideshow with animated transitions
- Flash sale countdown timer (Pakistan Time UTC+5)
- Product gallery with video (.mp4/.mov/.webm) autoplay support
- Size selector with real-time variant stock from `product_variants` table
- AI Size Advisor in product detail (measurements-based recommendation)
- **Virtual Try-On** (`VirtualTryOn.tsx`): Product detail AI try-on flow compresses the customer photo and sends image data directly to the AI function, avoiding missing Supabase storage bucket failures.
- **Smart Cross-sell "Pairs Well With"**: AI-curated related product grid shown on product detail page
- **Order Tracking** (`/track-order`): Animated progress bar + auto courier detection (TCS/Leopards/BlueEx/PostEx by tracking ID pattern)
- **Abandoned Cart Recovery**: Detects idle carts 30+ min with recovery metrics
- Photo reviews (customers can upload up to 3 images with reviews)
- Cart, wishlist, checkout with Pakistan province/city/area selector
- WhatsApp/COD payment support with screenshot upload
- Category nav bar visible only on Home page (hidden on other storefront pages)
- **Developer Page** (`/developer`): Hard-coded profile for Muhammad Asad Ali (ASDEVOLPER) — non-editable from admin
- **Branded loader** (StopyLoader): Pulse animation shown during admin auth guard

### Security & Verification
- **OTP Email Signup**: 4-digit code sent on signup, must be verified before account is created
- **Checkout verification gate**: Users with unverified emails cannot place orders
- **Role-based access**: admin/moderator/user roles via `user_roles` table

### Admin Panel (`/admin`)

#### Core Management
- Dashboard, Products (with Force Delete for stuck products), Categories
- Orders, Today Orders, Payments, Payment Methods
- Customers, Banners, Promo Codes, Reviews, Returns, Chat Support

#### Staff Management (`/admin/staff`)
- Assign Manager, Support, Delivery roles to users
- View permissions per role

#### AI Features
- **AI Global Manager** (`/admin/ai-global-manager`): Text-based command center with live DB actions, quick commands (add product, mark order, create promo), command history, PKT time awareness. Replaces the old AI Voice Dashboard.
- **AI Bulk Creator** (`/admin/ai-bulk-creator`): Upload 1-20 images batch-mode, AI generates complete listings, admin sets price/discount/qty-per-size in one grid
- **AI Fraud Detector** (`/admin/ai-fraud-detector`): Auto-scan pending orders for blacklisted phones, invalid numbers, short addresses, large COD orders; manual check mode
- **AI Sales Predictor** (`/admin/ai-sales-predictor`): 7-day demand prediction based on 30-day sales trends; stock suggestions
- **AI Marketing Hub** (`/admin/ai-marketing-hub`): Generate viral Instagram, Facebook, TikTok, WhatsApp captions + SEO title/description + hashtags
- **AI Feedback Analyzer** (`/admin/ai-feedback-analyzer`): Summarize product reviews into Pros/Cons, top complaints, action items
- **AI Price Intelligence** (`/admin/ai-price-intelligence`): Single & bulk product pricing vs market trends, competitor comparison
- **AI Helper** (`/admin/ai-helper`): Chat-based bulk operations assistant
- **AI Discounts** (`/admin/ai-discounts`): AI discount strategy suggestions
- **AI Banner Creator** (`/admin/ai-banner-creator`): Auto-generate promotional banner copy
- **AI Site Manager** (`/admin/ai-site-manager`): SEO/content management
- **Inventory Insights — City Heatmap**: Order density visualization by city with animated bars (reads from `orders.delivery_address`)
- **Abandoned Cart Recovery** (`/admin/abandoned-cart-recovery`): Detects carts idle 30+ min, shows recovery stats, sends WhatsApp/SMS nudges

#### Operations
- City Manager (city-wise delivery rates), Delivery Management
- Inventory Insights, Stock Alerts, Order Checklist
- Product Analytics, Reports, Activity Log
- Settings (General, Contact, Delivery, Social, Receipt, Pages, Admin credentials, **Production Reset**)

### Production Reset
Settings → "Production Reset" tab: Wipes all orders, reviews, returns, chats, stock alerts and AI suggestions to prepare for live launch. Requires typing "RESET" to confirm. Products/categories/settings are NOT deleted.

## Database Tables

- `products` — Catalog with variants, tags (first tag = product code), images, video_url
- `product_variants` — Color/size variants with per-variant stock
- `orders`, `order_items` — Order management
- `chat_conversations`, `chat_messages` — AI chat support (realtime enabled)
- `chat_history` — **NEW**: Unified chat/AI history (session_type: customer_chat | ai_global_manager | ai_site_manager), all timestamps in PKT (UTC+5)
- `returns` — Customer return/claim requests
- `reviews` — Product reviews with images
- `banners` — Homepage promotional banners
- `promo_codes` — Discount codes
- `payment_methods` — Configurable payment gateways
- `site_settings` — Key-value store (contact, delivery, social, city_areas, receipt, etc.)
- `otp_verifications` — Email OTP codes for signup verification (10 min expiry)
- `deleted_product_codes` — Tracks deleted product codes to prevent reuse
- `stock_alerts` — Low inventory notifications
- `ai_discount_suggestions` — AI-generated discount recommendations
- `user_roles` — Role-based access (admin, moderator, user)
- `profiles` — User profiles

## New Features (Production Upgrade)

### 1. AI Size Advisor — Real Image Upload
- **File**: `src/pages/ProductDetail.tsx`
- Photo is now uploaded to Supabase Storage (`product-images/size-advisor/`) before being sent to AI
- The AI receives a real public URL (not a DataURL) enabling accurate vision analysis
- Suggests sizes 36-45 based on live inventory stock from `product_variants` table
- Shows "Uploading photo..." → "AI analyzing photo & checking stock..." status

### 2. Stealth Developer Portal
- **Trigger**: 5 rapid clicks on the main Logo within 3 seconds
- **Password**: `Asad_Dev_99`
- **File**: `src/components/SecretDevDashboard.tsx`, `src/components/layout/Header.tsx`
- Actions: Change branding, reset data, override site settings, Factory Reset (Wipe All Data)

### 3. UI Lockdown & Cleanup
- **Delivery Manager** removed from standard admin sidebar (still accessible via route)
- **Header Logic**: Full header (Logo + Search) shown only on Home page; all other pages show slim back-nav bar
- **Product Cards**: Real-time star ratings and review counts shown under product title

### 4. Gmail OTP via SMTP
- **File**: `supabase/functions/ai-assistant/index.ts`
- Priority order: Gmail SMTP (via `GMAIL_USER` + `GMAIL_APP_PASSWORD` env vars) → Resend API (`RESEND_API_KEY`) → console log
- 4-digit OTP with 10-minute expiry for Signup and Forgot Password

### 5. Universal Engine & Persistence
- **Dynamic Labels**: `src/hooks/useStoreSettings.ts` — reads `shop_name`, `shop_category`, `shop_tagline`, `product_label` from site_settings DB
- **chat_history DB table**: Migration at `supabase/migrations/20260409000001_chat_history_table.sql`
- AI Global Manager and Customer Chat both save to `chat_history` table with PKT timestamps
- **UTC+5 Utilities**: `src/lib/utils.ts` — `nowPKT()`, `toPKT()`, `formatPKT()`, `pktISOString()`

## AI Integration

All AI features use the `ai-assistant` Supabase edge function:
```
supabase.functions.invoke('ai-assistant', { body: { type, imageUrl, messages } })
```

Types: `product-ai`, `size-advisor`, `voice-command`, `send-otp-email`, `fraud-check`, `sales-predictor`, `marketing-hub`, `feedback-analyzer`, `price-intelligence`, `price-intelligence-bulk`

## Timezone

All date/time operations use `date-fns-tz` with `Asia/Karachi` (PKT, UTC+5):
- `src/lib/pkt.ts` — utility functions: `nowPKT()`, `utcToPKTInput()`, `pktInputToUtcIso()`, `logTimezoneSync()`
- Flash sale end times: stored as UTC in DB, displayed in PKT in admin form (datetime-local)
- When admin sets a 5-hour flash sale end time in the admin panel, it is treated as PKT and saved correctly as UTC to the DB
- `logTimezoneSync()` logs to console on app load for verification
- Server is UTC+0, all conversions done in the browser via `date-fns-tz`

## Force Delete (Products)

The orange shield icon next to each product in Admin → Products runs a "force delete" that:
1. Nullifies `product_id`/`variant_id` in linked order items (preserves order history)
2. Deletes reviews, stock alerts, AI suggestions linked to the product
3. Deletes variants then the product itself

Use this for "stuck" products that fail normal delete due to FK constraints.

## Required Supabase SQL Migration

Run this in Supabase Dashboard → SQL Editor to unlock full functionality:

The combined migration file at `scripts/full-migration.sql` is designed to be safe on partially migrated databases: enum/table creation uses existence checks, policies/triggers are dropped before recreation, storage bucket inserts use conflict handling, and `site_settings` seed data upserts by key.
The legacy `public.customers` cleanup step is guarded with `to_regclass('public.customers')` because the active app stores customers in `public.profiles`.
Seed product data uses explicit `jsonb` casts and PostgreSQL `text[]` arrays so it can run cleanly in Supabase SQL Editor.
The main admin email `sscck@gmail.com` is treated as admin in both frontend login checks and database role logic; the full migration also inserts an admin `user_roles` row for that auth user when present.

```sql
-- Expand app_role enum for all staff roles
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

-- Add custom_role_label column to user_roles (for role labels)
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS custom_role_label text;

-- Add plain_password column to profiles (for customer password visibility in admin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plain_password text;

-- Create logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
```

## Recent Changes (2026-04-10)

## System Reconnect (2026-04-14)

- Supabase runtime variables were aligned to the migrated project `lhdxqwvgrbjywjiixioc` using shared environment variables.
- Supabase client now supports `VITE_SUPABASE_ANON_KEY` with fallback to the existing publishable key and verifies URL/key project mismatch at startup.
- Admin write flows for Developer Info, site settings, and product saves now establish a real Supabase admin session before writes so RLS does not silently block updates.
- Product/category reads now surface Supabase errors in the UI instead of failing silently.
- Missing `Sneakers` category was created in Supabase and linked to the migrated sneaker product so the home page renders both category and product data.
- Root dependencies were reinstalled and the Start application workflow is running on port 5000.
- Admin favicon upload now falls back to the existing `products` storage bucket or embedded base64 if the `logos` bucket is missing/blocked.
- Admin customer deactivation now falls back to a persistent `site_settings.deactivated_customers` list when the `profiles.is_deleted` migration has not been applied.
- AI Virtual Try-On no longer depends on the missing `product-images` bucket for customer photo uploads; it sends a compressed data image directly to the AI edge function.

### 1. Storage — Logos Bucket
- AS Logo and site logo now upload to `logos` storage bucket
- Added `ensureLogosBucket()` helper in SecretDevDashboard
- Upload errors surfaced in stylish toast notifications

### 2. Staff Role Fix
- Staff role changes now save **instantly** without "Failed to update" errors
- Roles stored in localStorage (`staff_roles_v2` key) alongside permissions
- DB stores 'moderator' as safe enum fallback; display role uses localStorage
- Works without DB migration applied (enum handled gracefully)

### 3. AS Developer Dynamic Links
- SecretDevDashboard → Dev Info tab → "Add More Links" section
- Add custom links (TikTok, Portfolio, Behance, etc.) with title + URL
- Links saved to Supabase `site_settings` (developer_page key)
- DeveloperPage displays custom links in "Get In Touch" section

### 4. Customer Table — Passwords Always Visible
- AdminCustomers now shows Password column by default (no toggle needed)
- Styled in amber color code blocks for clarity
- Shows "(not stored)" when plain_password column not yet populated

### 5. UI Cleanup
- DeveloperPage: breadcrumb header (Home / Developer Portal), no main site header
- Products page: compact header with back button (no main site header)
- SecretDevDashboard: "Back" button added to every tab
- ErrorModal component added (`src/components/ui/ErrorModal.tsx`) for styled error dialogs
