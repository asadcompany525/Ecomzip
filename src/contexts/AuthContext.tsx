import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'sscck@gmail.com';

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
    return { error: error?.message || null };
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      const resp = await supabase.functions.invoke('admin-login', {
        body: { email, password },
      });
      if (resp.error) return { error: resp.error.message || 'Login failed' };
      if (resp.data?.error) return { error: resp.data.error };

      if (resp.data?.session) {
        await supabase.auth.setSession({
          access_token: resp.data.session.access_token,
          refresh_token: resp.data.session.refresh_token,
        });
      }
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Admin login failed' };
    }
  };

  const signOut = async () => {
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
