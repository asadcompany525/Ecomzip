import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const adminEmail = "sscck@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service role is not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Missing admin session");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !callerData.user) throw new Error("Invalid admin session");

    const caller = callerData.user;
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .limit(1);

    if (caller.email?.toLowerCase() !== adminEmail && !roleRows?.length) {
      return new Response(JSON.stringify({ error: "Only admin can manage staff" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    if (body.action !== "createStaff") throw new Error("Unsupported action");

    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const displayRole = String(body.role || "staff").trim().toLowerCase();

    if (!name || !username || !email || password.length < 8) throw new Error("Missing staff name, username, email, or password");

    const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = listData.users?.find((u) => u.email?.toLowerCase() === email);
    let userId = existing?.id || "";

    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (error) throw error;
      userId = data.user.id;
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        user_id: userId,
        full_name: name,
        email,
        username,
        plain_password: password,
        is_deleted: false,
        staff_role: displayRole,
      }, { onConflict: "user_id" });
    if (profileError) throw profileError;

    const { data: roleData, error: roleError } = await admin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "moderator",
        custom_role_label: displayRole,
      }, { onConflict: "user_id,role" })
      .select("id")
      .single();
    if (roleError) throw roleError;

    await admin.from("site_settings").upsert({
      key: `staff_credentials_${userId}`,
      value: {
        name,
        username,
        email,
        password,
        role: displayRole,
        created_at: new Date().toISOString(),
      },
    }, { onConflict: "key" });

    return new Response(JSON.stringify({ success: true, user_id: userId, role_id: roleData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});