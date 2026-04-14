import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

type ForgotStep = 'email' | 'otp' | 'reset';
const ADMIN_EMAIL = 'sscck@gmail.com';

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { brandName, faviconUrl } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: 'Login Failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!' });
      navigate(email.trim().toLowerCase() === ADMIN_EMAIL ? '/admin' : '/');
    }
  };

  const sendForgotOtp = async () => {
    if (!forgotEmail.trim()) {
      toast({ title: 'Enter your email address', variant: 'destructive' });
      return;
    }
    setForgotLoading(true);
    try {
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await supabase.from('otp_verifications').delete().eq('email', forgotEmail);
      const { error: insertErr } = await supabase.from('otp_verifications').insert({
        email: forgotEmail, otp_code: otp, expires_at: expiresAt, verified: false,
      });
      if (insertErr) throw insertErr;
      await supabase.functions.invoke('ai-assistant', {
        body: { type: 'send-otp-email', email: forgotEmail, otp, name: '' },
      });
      toast({ title: 'OTP Sent!', description: `Check your inbox at ${forgotEmail}` });
      setForgotStep('otp');
    } catch (e: any) {
      toast({ title: 'Failed to send OTP', description: e.message, variant: 'destructive' });
    }
    setForgotLoading(false);
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 4) {
      toast({ title: 'Enter the 4-digit OTP', variant: 'destructive' });
      return;
    }
    setForgotLoading(true);
    try {
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', forgotEmail)
        .eq('otp_code', otpCode)
        .eq('verified', false)
        .maybeSingle();
      if (error || !data) throw new Error('Invalid OTP. Please try again.');
      if (new Date(data.expires_at) < new Date()) throw new Error('OTP has expired. Request a new one.');
      await supabase.from('otp_verifications').update({ verified: true }).eq('id', data.id);
      toast({ title: 'OTP Verified!', description: 'Now set your new password.' });
      setForgotStep('reset');
    } catch (e: any) {
      toast({ title: 'Verification Failed', description: e.message, variant: 'destructive' });
    }
    setForgotLoading(false);
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setForgotLoading(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke('ai-assistant', {
        body: { type: 'reset_password', email: forgotEmail, newPassword },
      });
      if (fnErr) throw fnErr;
      await supabase.from('otp_verifications').delete().eq('email', forgotEmail);
      toast({ title: 'Password Reset Successfully!', description: 'You can now login with your new password.' });
      setShowForgot(false);
      setForgotStep('email');
      setForgotEmail('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast({ title: 'Reset failed', description: e.message, variant: 'destructive' });
    }
    setForgotLoading(false);
  };

  const resetForgotFlow = () => {
    setShowForgot(false);
    setForgotStep('email');
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container py-10">
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-2xl border p-8 shadow-sm">
              <button onClick={resetForgotFlow} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </button>

              <div className="text-center mb-8">
                <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Forgot Password</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {forgotStep === 'email' && 'Enter your registered email address'}
                  {forgotStep === 'otp' && `Enter the 4-digit OTP sent to ${forgotEmail}`}
                  {forgotStep === 'reset' && 'Set your new password'}
                </p>
              </div>

              <div className="flex justify-center gap-2 mb-6">
                {(['email', 'otp', 'reset'] as ForgotStep[]).map((step, i) => (
                  <div key={step} className={`h-1.5 w-8 rounded-full transition-colors ${
                    i <= (['email', 'otp', 'reset'] as ForgotStep[]).indexOf(forgotStep) ? 'bg-primary' : 'bg-muted'
                  }`} />
                ))}
              </div>

              <div className="space-y-4">
                {forgotStep === 'email' && (
                  <>
                    <div>
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="your@email.com"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          className="pl-10"
                          onKeyDown={e => e.key === 'Enter' && sendForgotOtp()}
                        />
                      </div>
                    </div>
                    <Button className="w-full h-11" onClick={sendForgotOtp} disabled={forgotLoading}>
                      {forgotLoading ? 'Sending OTP...' : 'Send Reset OTP'}
                    </Button>
                  </>
                )}

                {forgotStep === 'otp' && (
                  <>
                    <div>
                      <Label htmlFor="otp-input">4-Digit OTP</Label>
                      <Input
                        id="otp-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="• • • •"
                        maxLength={4}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="text-center text-2xl tracking-[0.5em] font-bold mt-1 h-14"
                        onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                      />
                      <p className="text-xs text-muted-foreground mt-1">OTP expires in 10 minutes</p>
                    </div>
                    <Button className="w-full h-11" onClick={verifyOtp} disabled={forgotLoading || otpCode.length !== 4}>
                      {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                    <Button variant="ghost" className="w-full text-sm" onClick={() => { setForgotStep('email'); setOtpCode(''); }} disabled={forgotLoading}>
                      Didn't receive? Resend OTP
                    </Button>
                  </>
                )}

                {forgotStep === 'reset' && (
                  <>
                    <div>
                      <Label>New Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showNewPw ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label>Confirm Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Repeat new password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="pl-10"
                          onKeyDown={e => e.key === 'Enter' && resetPassword()}
                        />
                      </div>
                    </div>
                    <Button className="w-full h-11" onClick={resetPassword} disabled={forgotLoading}>
                      {forgotLoading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-10">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-2xl border p-8 shadow-sm">
            <div className="text-center mb-8">
              <img src={faviconUrl || '/favicon.ico'} alt={brandName || 'Store'} className="h-12 w-12 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">Welcome Back</h1>
              <p className="text-muted-foreground text-sm mt-1">Login to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">OR CONTINUE WITH</span>
              <div className="flex-1 border-t" />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                if (error) toast({ title: 'Google login failed', description: String(error), variant: 'destructive' });
              }}>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </Button>
            </div>

            <p className="text-center text-sm mt-6 text-muted-foreground">
              Don't have an account? <Link to="/signup" className="text-primary font-medium hover:underline">Sign Up</Link>
            </p>
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Login;
