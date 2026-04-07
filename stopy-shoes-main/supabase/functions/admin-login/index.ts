import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password } = await req.json();
    
    const adminEmail = "sscck@gmail.com";
    const adminPass = "sscck123";

    if (email !== adminEmail || password !== adminPass) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: adminEmail,
      password: adminPass,
    });

    if (signInError) {
      // Try updating the password for existing user
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email === adminEmail);
      
      if (existingUser) {
        // Update password
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: adminPass,
        });

        await supabaseAdmin.from("user_roles").upsert({
          user_id: existingUser.id,
          role: "admin",
        }, { onConflict: "user_id,role" });

        // Sign in with new password
        const { data: retryData, error: retryError } = await supabaseAdmin.auth.signInWithPassword({
          email: adminEmail,
          password: adminPass,
        });

        if (retryError) {
          return new Response(JSON.stringify({ error: "Failed to sign in after password update" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ session: retryData.session, user: retryData.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create admin user if doesn't exist at all
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPass,
        email_confirm: true,
        user_metadata: { full_name: "Admin" },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: "Failed to create admin: " + createError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("user_roles").upsert({
        user_id: createData.user.id,
        role: "admin",
      }, { onConflict: "user_id,role" });

      const { data: newSignIn, error: newSignInError } = await supabaseAdmin.auth.signInWithPassword({
        email: adminEmail,
        password: adminPass,
      });

      if (newSignInError) {
        return new Response(JSON.stringify({ error: "Failed to sign in admin" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ session: newSignIn.session, user: newSignIn.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin.from("user_roles").upsert({
      user_id: signInData.user.id,
      role: "admin",
    }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ session: signInData.session, user: signInData.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Admin login error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
