import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ORIGIN_HOSTS = [
  "localhost", "127.0.0.1",
  "replit.dev", "replit.app", "replit.co",
  "lovable.app", "lovable.dev",
  "vercel.app", "netlify.app",
  "stopy.shop", "stopy-shoes.com",
];

const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") || "sscck@gmail.com").toLowerCase();
const ADMIN_PASS = Deno.env.get("ADMIN_PASSWORD") || "sscck123";

const failedAttempts = new Map<string, { count: number; blockedUntil: number }>();
const FAIL_WINDOW_MS = 5 * 60_000;
const MAX_FAILS = 6;
const BLOCK_DURATION_MS = 15 * 60_000;

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const real = req.headers.get("x-real-ip") || "";
  return fwd.split(",")[0]?.trim() || real || "unknown";
}

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const host = u.hostname;
    return ALLOWED_ORIGIN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch { return false; }
}

function isBlocked(ip: string): { blocked: boolean; retryAfter?: number } {
  const rec = failedAttempts.get(ip);
  if (!rec) return { blocked: false };
  const now = Date.now();
  if (rec.blockedUntil > now) return { blocked: true, retryAfter: Math.ceil((rec.blockedUntil - now) / 1000) };
  if (now - rec.count > FAIL_WINDOW_MS) failedAttempts.delete(ip);
  return { blocked: false };
}

function recordFailure(ip: string) {
  const rec = failedAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  rec.count++;
  if (rec.count >= MAX_FAILS) rec.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  failedAttempts.set(ip, rec);
}

function recordSuccess(ip: string) {
  failedAttempts.delete(ip);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!originAllowed(req)) return json({ error: "Forbidden origin" }, 403);

  const ip = getClientIp(req);
  const blockState = isBlocked(ip);
  if (blockState.blocked) {
    return json({ error: `Too many failed attempts. Try again in ${Math.ceil((blockState.retryAfter || 60) / 60)} minutes.`, retryAfter: blockState.retryAfter }, 429);
  }

  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 8 * 1024) return json({ error: "Payload too large" }, 413);

    const raw = await req.text();
    if (raw.length > 8 * 1024) return json({ error: "Payload too large" }, 413);

    let body: any;
    try { body = JSON.parse(raw); }
    catch { recordFailure(ip); return json({ error: "Invalid request" }, 400); }

    const emailLower = String(body.email || "").trim().toLowerCase().slice(0, 200);
    const pwd = String(body.password || "").slice(0, 200);

    if (!emailLower || !pwd || pwd.length < 4 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      recordFailure(ip);
      return json({ error: "Invalid credentials" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const signInAndReturn = async (userEmail: string, userPwd: string, ensureRole?: string) => {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email: userEmail, password: userPwd });
      if (error) return null;
      if (ensureRole) {
        await supabaseAdmin.from("user_roles").upsert({ user_id: data.user.id, role: ensureRole }, { onConflict: "user_id,role" });
      }
      return data.session;
    };

    // Check DB for overridden admin credentials first
    let effectiveAdminEmail = ADMIN_EMAIL;
    let effectiveAdminPass = ADMIN_PASS;
    try {
      const { data: credData } = await supabaseAdmin
        .from("site_settings").select("value").eq("key", "admin_credentials").maybeSingle();
      if (credData?.value && typeof credData.value === "object") {
        const v = credData.value as any;
        if (v.email) effectiveAdminEmail = String(v.email).toLowerCase();
        if (v.password) effectiveAdminPass = String(v.password);
      }
    } catch {}

    if (emailLower === effectiveAdminEmail) {
      let session = await signInAndReturn(effectiveAdminEmail, effectiveAdminPass, "admin");
      if (!session && pwd === effectiveAdminPass) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = users?.find((u) => u.email?.toLowerCase() === effectiveAdminEmail);
        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { email: effectiveAdminEmail, password: effectiveAdminPass, email_confirm: true });
        } else {
          await supabaseAdmin.auth.admin.createUser({
            email: effectiveAdminEmail, password: effectiveAdminPass, email_confirm: true,
            user_metadata: { full_name: "Admin" },
          });
        }
        session = await signInAndReturn(effectiveAdminEmail, effectiveAdminPass, "admin");
      }
      if (!session || pwd !== effectiveAdminPass) {
        recordFailure(ip);
        return json({ error: "Invalid credentials" }, 401);
      }
      recordSuccess(ip);
      return json({ session, user: session });
    }

    const { data: directData, error: directError } = await supabaseAdmin.auth.signInWithPassword({ email: emailLower, password: pwd });
    if (!directError && directData.session) {
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", directData.user.id)
        .in("role", ["admin", "moderator"]).maybeSingle();
      if (!roleRow) {
        recordFailure(ip);
        return json({ error: "Access denied: no panel access for this account" }, 403);
      }
      recordSuccess(ip);
      return json({ session: directData.session, user: directData.user });
    }

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = users?.find((u) => u.email?.toLowerCase() === emailLower);

    if (existingUser) {
      const { data: roleRow } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", existingUser.id)
        .eq("role", "moderator").maybeSingle();
      if (roleRow) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { email_confirm: true, password: pwd });
        const { data: retryData, error: retryError } = await supabaseAdmin.auth.signInWithPassword({ email: emailLower, password: pwd });
        if (!retryError && retryData.session) {
          recordSuccess(ip);
          return json({ session: retryData.session, user: retryData.user });
        }
      }
    }

    const { data: credRow } = await supabaseAdmin
      .from("site_settings").select("key, value").like("key", "staff_credentials_%")
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
        if (!retryError && retryData.session) {
          recordSuccess(ip);
          return json({ session: retryData.session, user: retryData.user });
        }
      }
    }

    recordFailure(ip);
    return json({ error: "Invalid credentials" }, 401);
  } catch (e) {
    console.error("Login error:", e instanceof Error ? e.message : e);
    return json({ error: "Internal error" }, 500);
  }
});
