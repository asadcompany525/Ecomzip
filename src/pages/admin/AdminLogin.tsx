import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminLogin, signIn } = useAuth();
  const { brandName } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Try regular signIn first (works for staff with moderator role)
    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      // Fall back to admin edge-function login (for main admin)
      const { error: adminError } = await adminLogin(email, password);
      if (adminError) {
        toast({ title: 'Login Failed', description: adminError, variant: 'destructive' });
        setLoading(false);
        return;
      }
    } else {
      // Verify the user has admin or moderator role
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (userId) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .in('role', ['admin', 'moderator'])
          .maybeSingle();

        if (!roleData) {
          // Not an admin or staff — sign them out
          await supabase.auth.signOut();
          toast({
            title: 'Access Denied',
            description: 'You do not have panel access. Please use the customer login.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);
    toast({ title: 'Welcome to Panel!' });
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl border p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Panel Login</h1>
            <p className="text-muted-foreground text-sm mt-1">{brandName || 'Store'} Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Signing in...' : 'Enter Panel'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
