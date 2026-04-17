import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "sscck@gmail.com";
const ADMIN_PASS  = "sscck123";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { email, password } = await req.json();
    const emailLower = (email || "").trim().toLowerCase();
    const pwd = String(password || "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Helper: sign in and ensure role ──────────────────────────────────────
    const signInAndReturn = async (userEmail: string, userPwd: string, ensureRole?: string) => {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email: userEmail, password: userPwd });
      if (error) return null;
      if (ensureRole) {
        await supabaseAdmin.from("user_roles").upsert({ user_id: data.user.id, role: ensureRole }, { onConflict: "user_id,role" });
      }
      return data.session;
    };

    // ── Admin path ────────────────────────────────────────────────────────────
    if (emailLower === ADMIN_EMAIL) {
      let session = await signInAndReturn(ADMIN_EMAIL, ADMIN_PASS, "admin");

      if (!session) {
        // Try to find and fix the admin user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = users?.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);

        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: ADMIN_PASS, email_confirm: true });
        } else {
          await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL, password: ADMIN_PASS, email_confirm: true,
            user_metadata: { full_name: "Admin" },
          });
        }
        session = await signInAndReturn(ADMIN_EMAIL, ADMIN_PASS, "admin");
      }

      if (!session) return json({ error: "Admin login failed" }, 500);
      return json({ session, user: session });
    }

    // ── Staff / Moderator path ───────────────────────────────────────────────
    // Step 1: Try direct sign-in (works for confirmed emails)
    const { data: directData, error: directError } = await supabaseAdmin.auth.signInWithPassword({ email: emailLower, password: pwd });

    if (!directError && directData.session) {
      // Verify they have a staff (moderator) or admin role
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", directData.user.id)
        .in("role", ["admin", "moderator"])
        .maybeSingle();

      if (!roleRow) return json({ error: "Access denied: no panel access for this account" }, 403);
      return json({ session: directData.session, user: directData.user });
    }

    // Step 2: Email might not be confirmed — look up user and auto-confirm if they're a staff member
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = users?.find((u) => u.email?.toLowerCase() === emailLower);

    if (existingUser) {
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id)
        .eq("role", "moderator")
        .maybeSingle();

      if (roleRow) {
        // Auto-confirm + update password
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
          password: pwd,
        });

        const { data: retryData, error: retryError } = await supabaseAdmin.auth.signInWithPassword({ email: emailLower, password: pwd });
        if (!retryError && retryData.session) {
          return json({ session: retryData.session, user: retryData.user });
        }
      }
    }

    // Step 3: Try stored credentials from site_settings as last resort
    const { data: credRow } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .like("key", "staff_credentials_%")
      .then(async ({ data }) => {
        const match = (data || []).find((row: any) => {
          const v = typeof row.value === "object" ? row.value : {};
          return (v.email || "").toLowerCase() === emailLower && v.password === pwd;
        });
        return { data: match };
      });

    if (credRow) {
      const userId = (credRow.key as string).replace("staff_credentials_", "");
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "moderator").maybeSingle();

      if (roleRow) {
        await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true, password: pwd });
        const { data: retryData, error: retryError } = await supabaseAdmin.auth.signInWithPassword({ email: emailLower, password: pwd });
        if (!retryError && retryData.session) return json({ session: retryData.session, user: retryData.user });
      }
    }

    return json({ error: "Invalid credentials" }, 401);
  } catch (e) {
    console.error("Login error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
