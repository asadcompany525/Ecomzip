import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, User, KeyRound, CheckCircle } from 'lucide-react';

import BottomNav from '@/components/layout/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { toast } from '@/hooks/use-toast';

type Step = 'form' | 'otp' | 'done';
const OTP_LEN = 6;

const Signup = () => {
  const navigate = useNavigate();
  const { brandName, faviconUrl } = useStoreSettings();

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LEN).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LEN).fill(null));

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
          data: { full_name: name },
          emailRedirectTo: window.location.origin + '/',
        },
      });
      if (error) throw error;
      setStep('otp');
      startCooldown();
      toast({ title: '📧 Verification code sent!', description: `Check your inbox at ${email}` });
    } catch (e: any) {
      toast({ title: 'Failed to send code', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: 'Enter your full name', variant: 'destructive' }); return; }
    if (password !== confirmPassword) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    await sendOtp();
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (digit && index < OTP_LEN - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    if (text.length === OTP_LEN) {
      setOtpDigits(text.split(''));
      otpRefs.current[OTP_LEN - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const enteredCode = otpDigits.join('');
    if (enteredCode.length < OTP_LEN) {
      toast({ title: `Enter all ${OTP_LEN} digits`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: enteredCode,
        type: 'email',
      });
      if (error) throw error;

      if (data.session) {
        const { error: pwErr } = await supabase.auth.updateUser({ password });
        if (pwErr) console.warn('Password set failed:', pwErr.message);

        try {
          await supabase.from('profiles').update({
            full_name: name,
            plain_password: password,
          } as any).eq('user_id', data.session.user.id);
        } catch {}
      }

      setStep('done');
      toast({ title: '✅ Account created!', description: `Welcome to ${brandName || 'our store'}!` });
      setTimeout(() => navigate('/'), 1500);
    } catch (e: any) {
      toast({ title: 'Verification failed', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
    if (error) toast({ title: 'Google sign-up failed', description: error.message, variant: 'destructive' });
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <main className="container py-10">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-2xl border p-8 shadow-sm">
            <div className="text-center mb-8">
              <img src={faviconUrl || '/favicon.ico'} alt={brandName || 'Store'} className="h-12 w-12 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">
                {step === 'form' ? 'Create Account' : step === 'otp' ? 'Verify Email' : 'All Done!'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {step === 'form' ? `Join ${brandName || 'us'} today` :
                 step === 'otp' ? `We sent a 6-digit code to ${email}` :
                 'Your account is ready'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6">
              {['Details', 'Verify', 'Done'].map((label, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    (step === 'form' && i === 0) || (step === 'otp' && i === 1) || (step === 'done' && i === 2)
                      ? 'bg-primary text-primary-foreground'
                      : (step === 'otp' && i === 0) || step === 'done'
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {((step === 'otp' && i === 0) || (step === 'done' && i <= 1)) ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">{label}</span>
                  {i < 2 && <div className="w-6 h-px bg-muted mx-1" />}
                </div>
              ))}
            </div>

            {step === 'form' && (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="your@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" required minLength={6} />
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading || (!!password && !!confirmPassword && password !== confirmPassword)}>
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </Button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 border-t" />
                </div>

                <Button type="button" variant="outline" className="w-full h-11" onClick={handleGoogleSignup}>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>

                <p className="text-center text-sm mt-4 text-muted-foreground">
                  Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
                </p>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to</p>
                  <p className="font-semibold text-primary">{email}</p>
                  <p className="text-xs text-muted-foreground opacity-70">Check your inbox and spam folder</p>
                </div>

                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onFocus={e => e.target.select()}
                      className="w-11 h-13 text-center text-xl font-bold border-2 rounded-xl focus:border-primary focus:outline-none transition-colors bg-background"
                      style={{ height: '52px', width: '44px' }}
                    />
                  ))}
                </div>

                <Button onClick={verifyOtp} className="w-full h-11" disabled={loading || otpDigits.join('').length < OTP_LEN}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
                  {resendCooldown > 0 ? (
                    <p className="text-sm text-muted-foreground">Resend in {resendCooldown}s</p>
                  ) : (
                    <button onClick={sendOtp} disabled={loading} className="text-sm text-primary font-medium hover:underline">
                      Resend Code
                    </button>
                  )}
                  <button onClick={() => setStep('form')} className="block w-full text-xs text-muted-foreground hover:underline">
                    ← Change email
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center space-y-4 py-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <p className="font-bold text-lg">Welcome, {name}!</p>
                  <p className="text-sm text-muted-foreground mt-1">Your account has been verified.</p>
                </div>
                <p className="text-xs text-muted-foreground">Redirecting to home...</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Signup;
