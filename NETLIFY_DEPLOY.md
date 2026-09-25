# Netlify upload

## Quick upload (the ZIP)

1. Run `npm run package:netlify` in this project.
2. Upload the generated `netlify-upload.zip` at [Netlify Drop](https://app.netlify.com/drop).
3. Open the Netlify URL and test the home page, product pages, login, and checkout.

This ZIP contains the built static site, not the project source. It includes the SPA fallback so links such as `/product/...` and `/login` work when opened directly. It does not include `.env`, source files, or Supabase server secrets.

The frontend needs Supabase's public anon/publishable key, which is compiled into browser JavaScript during the build. That key is intended to be public; database access must be protected by Supabase RLS policies. The build check rejects service-role and Supabase secret keys.

## Supabase Auth setup after the first upload

Netlify assigns the site URL after the upload. In Supabase, open **Authentication → URL Configuration**:

- Set **Site URL** to the main Netlify URL, for example `https://your-store.netlify.app`.
- Add `https://your-store.netlify.app/**` under **Redirect URLs**.
- If using a custom domain, set the Site URL to that domain and add `https://your-custom-domain/**` too.

This is needed for email-link and OAuth sign-in redirects. Keep the provider callback URLs shown by Supabase configured with the OAuth provider.

## Rebuilding or using Git-based deploys

For a Git-connected Netlify site, add these under **Site configuration → Environment variables** before building:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)

Then Netlify uses `netlify.toml` to run the validated production build and publish `dist`. The same variables can be placed in a local `.env` file based on `.env.example` before running `npm run package:netlify`.

Never add a Supabase `service_role` or `sb_secret_` key to the frontend, a `VITE_*` variable, or an upload ZIP. Do not share `.env`.

## What Netlify does not deploy

This ZIP publishes the React/Vite website only. Supabase database tables, RLS policies, Storage buckets, Auth settings, and Edge Functions stay in Supabase. Existing Supabase functions must already be deployed to the same Supabase project referenced by the frontend.

Google Places address autocomplete is optional; it requires `VITE_GOOGLE_MAPS_API_KEY` at build time and a Google Maps key restricted to the deployed domain. Checkout still allows manual address entry without it.