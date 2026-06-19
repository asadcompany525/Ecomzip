// ============================================================
// adminSession — Admin ke liye active Supabase session ensure karta hai
// Admin pages mein DB writes karne se pehle call karo
// ============================================================

import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'sscck@gmail.com';
const ADMIN_PASSWORD = 'sscck123';

// Agar session hai to wahi return karo, warna admin login karke session banao
// Usage: await ensureAdminSession() — admin write operations se pehle
export const ensureAdminSession = async () => {
  // Pehle check karo koi active session hai
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session;

  // Session nahi hai — edge function se login karo
  const resp = await supabase.functions.invoke('admin-login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (resp.error) throw new Error(resp.error.message || 'Admin login failed');
  if (resp.data?.error) throw new Error(resp.data.error);
  if (!resp.data?.session?.access_token || !resp.data?.session?.refresh_token) {
    throw new Error('Admin login did not return a valid session');
  }

  // Session set karo aur return karo
  const { data, error } = await supabase.auth.setSession({
    access_token: resp.data.session.access_token,
    refresh_token: resp.data.session.refresh_token,
  });

  if (error) throw error;
  return data.session;
};
