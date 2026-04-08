# Stopy Shoes

A React 18 + Vite + Supabase e-commerce storefront for a Pakistani shoes and bags store — Pakistan's #1 Shoes & Bags Store.

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
- Photo reviews (customers can upload up to 3 images with reviews)
- Cart, wishlist, checkout with Pakistan province/city/area selector
- Order tracking page with visual progress bar
- WhatsApp/COD payment support with screenshot upload

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
- **AI Bulk Creator** (`/admin/ai-bulk-creator`): Upload 1-20 images batch-mode, AI generates complete listings, admin sets price/discount/qty-per-size in one grid
- **AI Fraud Detector** (`/admin/ai-fraud-detector`): Auto-scan pending orders for blacklisted phones, invalid numbers, short addresses, large COD orders; manual check mode
- **AI Sales Predictor** (`/admin/ai-sales-predictor`): 7-day demand prediction based on 30-day sales trends; stock suggestions
- **AI Marketing Hub** (`/admin/ai-marketing-hub`): Generate viral Instagram, Facebook, TikTok, WhatsApp captions + SEO title/description + hashtags
- **AI Feedback Analyzer** (`/admin/ai-feedback-analyzer`): Summarize product reviews into Pros/Cons, top complaints, action items
- **AI Price Intelligence** (`/admin/ai-price-intelligence`): Single & bulk product pricing vs market trends, competitor comparison
- **AI Helper** (`/admin/ai-helper`): Chat-based bulk operations assistant
- **AI Voice Dashboard** (`/admin/ai-voice`): Urdu/English voice commands for admin queries
- **AI Discounts** (`/admin/ai-discounts`): AI discount strategy suggestions
- **AI Banner Creator** (`/admin/ai-banner-creator`): Auto-generate promotional banner copy
- **AI Site Manager** (`/admin/ai-site-manager`): SEO/content management

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

## AI Integration

All AI features use the `ai-assistant` Supabase edge function:
```
supabase.functions.invoke('ai-assistant', { body: { type, imageUrl, messages } })
```

Types: `product-ai`, `size-advisor`, `voice-command`, `send-otp-email`, `fraud-check`, `sales-predictor`, `marketing-hub`, `feedback-analyzer`, `price-intelligence`, `price-intelligence-bulk`

## Force Delete (Products)

The orange shield icon next to each product in Admin → Products runs a "force delete" that:
1. Nullifies `product_id`/`variant_id` in linked order items (preserves order history)
2. Deletes reviews, stock alerts, AI suggestions linked to the product
3. Deletes variants then the product itself

Use this for "stuck" products that fail normal delete due to FK constraints.
