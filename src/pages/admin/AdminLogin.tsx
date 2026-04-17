import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const { brandName } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Enter email and password', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { error } = await adminLogin(email.trim(), password);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.includes('Invalid credentials') || error.includes('invalid_credentials')
          ? 'Wrong email or password. Please check and try again.'
          : error,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setLoading(false);
    toast({ title: 'Welcome!' });
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
                <Input
                  id="email" type="email" placeholder="Your email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-10" required autoComplete="email"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10" required autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Signing in…' : 'Enter Panel'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
