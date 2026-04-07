# Stopy Shoes

A React 18 + Vite + Supabase e-commerce storefront for a Pakistani shoes and bags store.

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

## Key Features Implemented

### UI / Mobile
- Mobile header: Hamburger | Logo | Search icon + Cart (single row)
- Animated slide-out menu and collapsible search bar
- Flash Sale timer uses UTC+5 (Pakistan Time) via `getTimeUntilMidnightPKT()`
- Original price only displayed when discount > 0
- Video (.mp4/.mov/.webm) gallery support in ProductDetail

### Admin Panel
- **AI Bulk Creator** (`/admin/ai-bulk-creator`): Upload product image or URL → AI generates complete listing
- **AI Claim Validator** (`/admin/ai-claim-validator`): AI validates customer return claims against product policy
- **AI Size Advisor** (`/admin/ai-size-advisor`): AI recommends shoe size from measurements or foot photo
- **AI Background Enhancer** (`/admin/ai-bg-enhancer`): Remove product backgrounds and replace with studio colors
- **AI Voice Dashboard** (`/admin/ai-voice`): Speak Urdu/English commands → AI fetches and reads live data
- **Add Size** in variant table: Admin can add custom sizes beyond defaults; they propagate to all variants
- City Manager sync: Checkout loads provinces/cities/areas from `site_settings.city_areas` (falls back to hardcoded)

### DB / Security
- **OTP Signup**: 4-digit email verification step in Signup flow (stored in `otp_verifications` table)
- **Product code non-repeat**: Deleted product codes saved in `deleted_product_codes` table; Auto-generator skips them
- **Guest chat persistence**: AI chat history saved to localStorage for non-logged-in users (Supabase for logged-in)

## Database Tables (key)

- `products` — Product catalog with variants, tags (first tag = product code), images
- `product_variants` — Color/size variants with stock counts
- `orders`, `order_items` — Order management
- `chat_conversations`, `chat_messages` — AI chat support
- `returns` — Customer return/claim requests
- `site_settings` — Key-value store (includes `city_areas` JSON for checkout)
- `otp_verifications` — Email OTP codes for signup verification (expires in 10 min)
- `deleted_product_codes` — Tracks codes of deleted products to prevent reuse

## AI Features (via `ai-assistant` edge function)

All AI features call `supabase.functions.invoke('ai-assistant', { body: { type, imageUrl, messages } })`
- `product-ai` — Bulk product generation from image/URL
- `claim-validator` — Return claim analysis against policy
- `size-advisor` — Shoe size recommendation
- `bg-remove` — Background removal/replacement
- `voice-command` — Natural language admin queries
- `send-otp-email` — Email OTP for signup
