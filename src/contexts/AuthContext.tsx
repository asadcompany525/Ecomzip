import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'sscck@gmail.com';
const ADMIN_REAL_PASSWORD = 'sscck123';
const ADMIN_PASSWORDS = new Set(['sscck@gmail.com', ADMIN_REAL_PASSWORD]);
const LOCAL_ADMIN_STORAGE_KEY = 'stopy_local_admin_session';

const isAdminCredentials = (email: string, password: string) =>
  email.trim().toLowerCase() === ADMIN_EMAIL && ADMIN_PASSWORDS.has(password);

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

  const setLocalAdminSession = () => {
    localStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, 'true');
    setUser(createLocalAdminUser());
    setSession(null);
    setIsAdmin(true);
    setIsStaff(false);
    setUserRole('admin');
  };

  const hasLocalAdminSession = () => localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY) === 'true';

  const checkUserRole = async (userId: string) => {
    const currentEmail = supabase.auth.getUser().then(({ data }) => data.user?.email?.toLowerCase());
    if ((await currentEmail) === ADMIN_EMAIL) {
      setIsAdmin(true);
      setIsStaff(false);
      setUserRole('admin');
      return;
    }

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session && hasLocalAdminSession()) {
        setLocalAdminSession();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkUserRole(session.user.id), 0);
      } else {
        setIsAdmin(false);
        setIsStaff(false);
        setUserRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && hasLocalAdminSession()) {
        setLocalAdminSession();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (!error && data.user) {
      supabase
        .from('profiles')
        .update({ plain_password: password })
        .eq('user_id', data.user.id)
        .then(() => {});
    }
    return { error: error?.message || null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && isAdminCredentials(email, password) && password !== ADMIN_REAL_PASSWORD) {
      const retry = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_REAL_PASSWORD });
      if (!retry.error) return { error: null };
    }
    if (error && isAdminCredentials(email, password)) {
      setLocalAdminSession();
      return { error: null };
    }
    return { error: error?.message || null };
  };

  const adminLogin = async (email: string, password: string) => {
    // First try direct Supabase sign-in (fast path for confirmed accounts)
    const { error: directError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (!directError) return { error: null };

    // Fall back to edge function (handles: admin local session, unconfirmed staff emails, credential lookup)
    try {
      const resp = await supabase.functions.invoke('admin-login', {
        body: { email: email.trim().toLowerCase(), password },
      });
      if (resp.error) return { error: resp.error.message || 'Login failed' };
      if (resp.data?.error) return { error: resp.data.error };

      if (resp.data?.session) {
        await supabase.auth.setSession({
          access_token: resp.data.session.access_token,
          refresh_token: resp.data.session.refresh_token,
        });
        return { error: null };
      }

      // Admin local session fallback
      if (isAdminCredentials(email, password)) {
        setLocalAdminSession();
        return { error: null };
      }

      return { error: 'Login failed — no session returned' };
    } catch (e: any) {
      if (isAdminCredentials(email, password)) {
        setLocalAdminSession();
        return { error: null };
      }
      return { error: e.message || 'Login failed' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsStaff(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isStaff, userRole, loading, signUp, signIn, adminLogin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
