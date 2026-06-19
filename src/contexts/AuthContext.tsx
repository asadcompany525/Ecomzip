// ============================================================
// AuthContext — User authentication state poori app mein manage karta hai
// Supabase Auth + Local admin fallback (DB down ho to bhi admin login ho sake)
// ============================================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// Admin credentials (frontend check ke liye)
const ADMIN_EMAIL = 'sscck@gmail.com';
const ADMIN_REAL_PASSWORD = 'sscck123';
const ADMIN_PASSWORDS = new Set([ADMIN_EMAIL, ADMIN_REAL_PASSWORD]); // dono accepted hain
const LOCAL_ADMIN_STORAGE_KEY = 'stopy_local_admin_session';

// Check karo ke email+password admin ke hain
const isAdminCredentials = (email: string, password: string) =>
  email.trim().toLowerCase() === ADMIN_EMAIL && ADMIN_PASSWORDS.has(password);

// Supabase down hone par local admin user object banao (fallback)
const createLocalAdminUser = (): User => ({
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: ADMIN_EMAIL,
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'local-admin', providers: ['local-admin'] },
  user_metadata: { full_name: 'Admin' },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
} as User);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isStaff: boolean;
  userRole: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  adminLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // localStorage mein admin session flag set karo (offline fallback ke liye)
  const setLocalAdminSession = () => {
    localStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, 'true');
    setUser(createLocalAdminUser());
    setSession(null);
    setIsAdmin(true);
    setIsStaff(false);
    setUserRole('admin');
  };

  const hasLocalAdminSession = () =>
    localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY) === 'true';

  // user_roles table se role check karo
  const checkUserRole = async (userId: string, userEmail?: string) => {
    // Email se direct admin check karo (DB query avoid)
    if (userEmail?.toLowerCase() === ADMIN_EMAIL) {
      setIsAdmin(true);
      setIsStaff(false);
      setUserRole('admin');
      return;
    }

    // DB se role fetch karo
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'moderator'])
      .maybeSingle();

    if (data?.role === 'admin') {
      setIsAdmin(true);
      setIsStaff(false);
      setUserRole('admin');
    } else if (data?.role === 'moderator') {
      setIsAdmin(false);
      setIsStaff(true);
      setUserRole('moderator');
    } else {
      setIsAdmin(false);
      setIsStaff(false);
      setUserRole(null);
    }
  };

  useEffect(() => {
    // Auth state changes (login/logout) sun-ne ke liye listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session && hasLocalAdminSession()) {
        setLocalAdminSession();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkUserRole(session.user.id, session.user.email);
      } else {
        setIsAdmin(false);
        setIsStaff(false);
        setUserRole(null);
      }
      setLoading(false);
    });

    // App load pe existing session check karo
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session && hasLocalAdminSession()) {
        setLocalAdminSession();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await checkUserRole(session.user.id, session.user.email);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Naya user account banao + password localStorage mein save karo (admin visibility ke liye)
  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (!error && data.user) {
      // Admin customers page pe plain password dikha sake — optional feature
      supabase
        .from('profiles')
        .update({ plain_password: password })
        .eq('user_id', data.user.id)
        .then(() => {});
    }
    return { error: error?.message || null };
  };

  // Regular user login
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    // Admin ne purana alias password use kiya — real password se retry karo
    if (error && isAdminCredentials(email, password) && password !== ADMIN_REAL_PASSWORD) {
      const retry = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_REAL_PASSWORD });
      if (!retry.error) return { error: null };
    }

    // Supabase unavailable — local fallback
    if (error && isAdminCredentials(email, password)) {
      setLocalAdminSession();
      return { error: null };
    }

    return { error: error?.message || null };
  };

  // Admin panel login — 3 steps: direct Supabase → edge function → local fallback
  const adminLogin = async (email: string, password: string) => {
    // Step 1: Direct Supabase sign-in (fastest path)
    const { data: directData, error: directError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (!directError && directData.session?.user) {
      setSession(directData.session);
      setUser(directData.session.user);
      await checkUserRole(directData.session.user.id, directData.session.user.email);
      return { error: null };
    }

    // Step 2: Edge function (unconfirmed emails, credential lookup)
    try {
      const resp = await supabase.functions.invoke('admin-login', {
        body: { email: email.trim().toLowerCase(), password },
      });
      if (resp.error) return { error: resp.error.message || 'Login failed' };
      if (resp.data?.error) return { error: resp.data.error };

      if (resp.data?.session) {
        const { data } = await supabase.auth.setSession({
          access_token: resp.data.session.access_token,
          refresh_token: resp.data.session.refresh_token,
        });
        if (data.session?.user) {
          setSession(data.session);
          setUser(data.session.user);
          await checkUserRole(data.session.user.id, data.session.user.email);
        }
        return { error: null };
      }

      // Step 3: Local admin fallback
      if (isAdminCredentials(email, password)) {
        setLocalAdminSession();
        return { error: null };
      }

      return { error: 'Login failed — no session returned' };
    } catch (e: any) {
      // Network error — admin ke liye local fallback
      if (isAdminCredentials(email, password)) {
        setLocalAdminSession();
        return { error: null };
      }
      return { error: e.message || 'Login failed' };
    }
  };

  // Logout — session aur local flags clear karo
  const signOut = async () => {
    localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsStaff(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, isAdmin, isStaff, userRole, loading,
      signUp, signIn, adminLogin, signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
