import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'sscck@gmail.com';
const ADMIN_PASSWORD = 'sscck123';

export const ensureAdminSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session;

  const resp = await supabase.functions.invoke('admin-login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (resp.error) throw new Error(resp.error.message || 'Admin login failed');
  if (resp.data?.error) throw new Error(resp.data.error);
  if (!resp.data?.session?.access_token || !resp.data?.session?.refresh_token) {
    throw new Error('Admin login did not return a valid session');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: resp.data.session.access_token,
    refresh_token: resp.data.session.refresh_token,
  });

  if (error) throw error;
  return data.session;
};