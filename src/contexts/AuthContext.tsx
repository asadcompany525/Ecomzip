// ============================================================
// AuthContext — Supabase authentication and application roles
// ============================================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// This account still signs in through Supabase; this only preserves its admin role.
const ADMIN_EMAIL = 'sscck@gmail.com';
type AppRole = 'admin' | 'moderator' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isStaff: boolean;
  userRole: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: AppRole }>;
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

  // Authenticated Supabase account ka role resolve karo.
  const checkUserRole = async (userId: string, userEmail?: string): Promise<AppRole> => {
    let role: AppRole = null;

    // Supabase authentication is still mandatory for the configured owner account.
    if (userEmail?.toLowerCase() === ADMIN_EMAIL) {
      role = 'admin';
    } else {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .in('role', ['admin', 'moderator'])
          .maybeSingle();

        if (data?.role === 'admin' || data?.role === 'moderator') {
          role = data.role;
        }
      } catch {
        // A role lookup failure must never grant admin access.
        role = null;
      }
    }

    setIsAdmin(role === 'admin');
    setIsStaff(role === 'moderator');
    setUserRole(role);
    return role;
  };

  useEffect(() => {
    // Auth state changes (login/logout) sun-ne ke liye listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    }).catch(() => {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setIsStaff(false);
      setUserRole(null);
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

  // Single password login for customers, admins, and staff.
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setLoading(false);
        return { error: error.message, role: null };
      }
      if (!data.user) {
        setLoading(false);
        return { error: 'Login failed — no user returned', role: null };
      }

      setSession(data.session);
      setUser(data.user);
      const role = await checkUserRole(data.user.id, data.user.email);
      setLoading(false);
      return { error: null, role };
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || 'Login failed', role: null };
    }
  };

  // Logout — Supabase session aur local role state clear karo.
  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsStaff(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, isAdmin, isStaff, userRole, loading,
      signUp, signIn, signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
