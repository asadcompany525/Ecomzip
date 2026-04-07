# Stopy Shoes

A React + Vite e-commerce storefront for shoes, originally built with Lovable.

## Architecture

- **Frontend**: React 18, TypeScript, Vite (port 5000)
- **Styling**: Tailwind CSS, shadcn/ui component library
- **Routing**: React Router DOM v6
- **State**: React Query (TanStack), React Context (Auth, Cart, Language)
- **Backend**: Supabase (auth, database, edge functions)
- **Charts**: Recharts
- **Animations**: Framer Motion

## Project Structure

- `src/pages/` — All page-level components (storefront + admin panel)
- `src/components/` — Reusable UI components (layout, home, admin, chat)
- `src/contexts/` — React contexts (AuthContext, CartContext, LanguageContext)
- `src/integrations/supabase/` — Supabase client and generated types
- `src/data/` — Static demo data
- `supabase/migrations/` — Database migration SQL files
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
