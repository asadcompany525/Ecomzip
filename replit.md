# Stopy Shoes

A React 18 + Vite + Supabase e-commerce storefront for a Pakistani shoes and bags store — Pakistan's #1 Shoes & Bags Store.

## Recent Changes (May 2026 — Session 3)
- **Currency Auto-Detection**: `src/hooks/useCurrencyConverter.ts` — detects visitor's country via `ipapi.co`, maps to currency (PKR/USD/AED/GBP/EUR/SAR/CAD/AUD), fetches live rates from `open.er-api.com` (free, no key), caches 6 hours. Rates show site-wide on ProductCard and ProductDetail. `CurrencySelector` dropdown in header lets user manually override. Preferred currency saved to localStorage.
- **International Phone Picker**: `src/components/ui/PhoneInput.tsx` — searchable dropdown of 25 countries with flag + dial code, attached to both Phone and WhatsApp fields in Checkout. Phone validation relaxed from Pakistan-only regex to minimum 7 digits (supports any country).
- **Meshy.ai 3D Model Generation**: Admin → Products → "Generate 3D Model" button (purple) in the Images & Video section. Calls `meshy.ai/v1/image-to-3d` API, polls for up to 2 min, saves `.glb` URL to `product.video_url`. Requires `VITE_MESHY_API_KEY` env var (free key at meshy.ai). Disabled if no product image is uploaded.
- **Realistic AI Virtual Try-On**: The `VirtualTryOn.tsx` component already calls `virtual-tryon-start`/`virtual-tryon-poll` in the edge function — just set `REPLICATE_API_KEY` as a Supabase secret to activate real IDM-VTON. Falls back to canvas preview if key is missing.
- **Google Places Address Autocomplete**: Checkout injects the Google Maps JS API script when `VITE_GOOGLE_MAPS_API_KEY` is set, attaches Places Autocomplete to the address textarea. Silently skipped if key is not set.
- **Checkout navigate fix**: `if (items.length === 0) navigate('/cart')` moved into `useEffect` to avoid React render-update warning.

## Recent Changes (May 2026 — Session 2)
- **MySettings fix**: Profile load now only selects existing columns (`full_name, username, phone, whatsapp, avatar_url, email`). Extended preferences (bio, gender, dob, city, notification toggles) saved to localStorage under `stopy_prefs_{userId}`. Saves no longer write to missing `settings` column — avoids 400 error.
- **AdminNewsletter fix**: `send-newsletter` edge function call now wrapped in try/catch. If function is unavailable, gracefully logs to `email_logs` as `partial` status and shows informative toast instead of crashing.
- **Missing DB columns identified**: `profiles` table is missing `bio, gender, dob, city, settings`. Migration file created at `supabase/migrations/20260502000001_fix_missing_tables_and_columns.sql` — user must apply from Supabase Dashboard → SQL Editor.
- **Edge function audit**: Only 4 functions called site-wide: `admin-login` ✅, `admin-staff` ✅, `ai-assistant` ✅, `send-newsletter` ❌ (not deployed — now handled gracefully).

## Pending: Database Migration Required
The `profiles` table is missing extended columns. **To fix fully, run this in Supabase Dashboard → SQL Editor:**
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
```
Full migration is at `supabase/migrations/20260502000001_fix_missing_tables_and_columns.sql`

## Recent Changes (May 2026 — Session 1)
- **PageBreadcrumb component**: Created `src/components/layout/PageBreadcrumb.tsx` — reusable breadcrumb with Home icon + ChevronRight separators. Added to all user pages: Products, ProductDetail, Wishlist, Cart, NewArrivals, DiscountItems, FlashSalePage, Contact, FAQ, MyOrders, MyAddresses, MyReturns, MyReviews, MySettings.
- **My Account page (MyPage.tsx) redesign**: Replaced narrow `max-w-md` layout with `max-w-5xl` 2-column desktop grid — profile card on left, grouped menu sections on right. Stats grid, avatar upload, Admin Panel link.
- **MySettings 30+ settings**: Rewrote to 6-tab sidebar layout (Profile, Notifications, Shopping, Privacy, Display, Security). 30+ fields including gender, DOB, WhatsApp, city, 9 notification toggles, 3 preference toggles, privacy controls, theme/language/currency, password change.
- **VirtualTryOn popup fix**: Uses `h-[100dvh]`, `overflow-x-hidden`, proper landscape handling, reduced upload button padding.
- **AdminChat staff fix**: Added `ensureAdminSession()` before `fetchConvos()` so staff can see all conversations.
- **Loader on 4 pages only**: Changed from global `<StopyLoader fullScreen />` to targeted Suspense boundaries only on: Index (home), ProductDetail, Checkout, OrderSuccess.
- **StopyLoader improved**: New design with rotating gradient ring, inner logo circle, animated brand name + 3-dot indicator.
- **AdminProductSeeder page**: New admin page `/admin/product-seeder` that seeds 100 dummy products in batches of 20 using admin session. Added to admin sidebar.

## Recent Changes (April 2026)
- **Edge function security hardening**: `ai-assistant` and `admin-login` now enforce: origin allowlist (replit.dev/.app/.co + custom domains), per-IP rate limiting (30 req/min general, 8/min for AI image work), payload size caps (256 KB body, 8 KB for login, 8 K char per message, 40 messages max), input validation, sanitized error messages (no internal leaks), and brute-force lockout for admin login (6 fails → 15 min IP block).
- **Gemini API key now in Supabase Secret vault** (env `GEMINI_API_KEYS`, comma-separated for multi-key rotation). Removed from publicly-readable `site_settings` table. Function rotates across all configured keys × 4 model fallback chain (`gemini-2.5-flash` → `2.0-flash` → `2.0-flash-lite` → `2.5-flash-lite`) for maximum free-tier throughput.
- **`site_settings` RLS lockdown**: Anonymous users can now only read non-sensitive keys (contact, delivery, social, logo, etc.). `gemini_api_key`, `staff_credentials_*`, and `staff_access_*` are admin-only. Previously these were world-readable.
- **Multi-key Gemini support**: To get more throughput, set `GEMINI_API_KEYS` env var as `key1,key2,key3` — function auto-rotates and falls back on rate limits. For truly unlimited use, enable billing on the Gemini key.
- **Staff access persistence fix**: Staff permissions and role labels are now saved in `site_settings` under `staff_access_{user_id}`, so staff can log in from their own browser and still receive the assigned panel access. Local storage remains only as a fallback.
- **Full smoke test follow-up**: All public and admin routes return HTTP 200 and render without runtime crashes. Admin login returns a valid session. Code now avoids hard failures when optional staff columns (`custom_role_label`, `username`, `staff_role`, `plain_password`) or `staff_attendance` are missing.
- **Contact messages policy fix**: The contact messages setup SQL now includes public insert and admin/staff select/update policies, and the admin inbox no longer labels RLS errors as "table not created".
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
- Permissions are primarily stored in Supabase `site_settings` key `staff_access_{user_id}`.
- `localStorage` keys `staff_permissions_v3` and `staff_roles_v3` remain as browser fallback caches.
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
Latest test confirmed the live Supabase database still needs `contact_messages` and `staff_attendance` tables applied in the SQL Editor; app code handles missing tables, but those features cannot fully work until the SQL is run.
Latest test also confirmed the deployed `admin-staff` Edge Function is missing/not deployed. The frontend has a signup fallback for new staff creation, but password sync for old saved staff credentials needs the function deployed or those staff accounts recreated.

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

## Recent Changes (May 2026 — Big System Overhaul)

### Critical Fixes
- **AI Claim Validator**: Now auto-updates `returns` table status (approved/rejected/pending) in Supabase after AI decision. "Apply Decision to DB" button also available for manual confirmation. Shows "DB Updated" badge on each claim.
- **Global Landscape Fix**: `overflow-x: hidden` added to `html` and `body`. `box-sizing: border-box` on all elements. Zero horizontal scroll across all screen sizes.
- **Profile Pic Uploader**: `MySettings.tsx` and `MyPage.tsx` now have functional camera icon → uploads to `avatars` Supabase storage bucket → instantly updates `profiles.avatar_url`.
- **Order Tracking Stepper**: `MyOrders.tsx` has visual 5-step timeline (Ordered → Confirmed → Processing → Shipped → Delivered) toggled per order. Skeleton loaders for item images.
- **Breadcrumbs**: Added to `MyOrders`, `MySettings`, and other pages.

### New Admin Pages
- **Finance & Profit/Loss Ledger** (`/admin/finance-ledger`): Monthly revenue vs expenses, P&L summary, 6-month chart, expense CRUD (stored in `site_settings.finance_expenses`).
- **Staff Salary Management** (`/admin/staff-salary`): Set monthly salary per staff member, track 12-month payment status (green = paid, red = unpaid), totals and disbursement tracking (stored in `site_settings.staff_salaries`).
- **Tech & Error Logs** (`/admin/tech-logs`): System health check (counts from all DB tables), error/warn/info log viewer with filter/search/clear, manual JSON database backup export.

### Sidebar Cleanup
- **Removed from sidebar**: "AI Virtual Try-On" and "AI Size Advisor" (routes still work, just not in sidebar)
- **Moved "AI Claim Validator"** to Operations group (near Returns)
- **Added Finance group**: Profit/Loss Ledger + Staff Salary
- **Added Tech Logs**: to Operations group
- **Renamed sidebar entry**: "Returns/Claims" → "Claims & Returns"

### Staff Permissions
- Added `page_finance` (Finance & Staff Salary) and `page_tech` (Tech & Error Logs) to `AdminStaff.tsx` PAGE_PERMISSIONS

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

### Virtual Try-On — Free Preview Mode (April 30, 2026)
- Real AI try-on (Replicate IDM-VTON / FashnAI) requires paid Replicate billing ($5 min credit). Without billing, all paid AI image services return 402.
- Both customer (`VirtualTryOn.tsx`) and admin (`AdminAiVirtualTryon.tsx`) pages now use a shared canvas-overlay fallback (`src/lib/tryonCanvas.ts`) that always works for free.
- Admin page shows a clear "Preview Mode (Free)" notice with link to enable Replicate billing.
- Flow: try AI → on any failure (start error, poll fail, or timeout) → instantly fall back to canvas preview. User always gets a result.
