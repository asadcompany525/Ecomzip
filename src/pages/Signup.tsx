import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, User, KeyRound, CheckCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Step = 'form' | 'otp' | 'done';

const Signup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a random 4-digit OTP
  const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    cooldownRef.current = interval;
  };

  const sendOtp = async () => {
    setLoading(true);
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

    try {
      // Store OTP in Supabase
      await supabase.from('otp_verifications').upsert({
        email: email.toLowerCase().trim(),
        otp_code: otp,
        expires_at: expiresAt,
        verified: false,
      }, { onConflict: 'email' });

      // Try to send via AI assistant function
      try {
        await supabase.functions.invoke('ai-assistant', {
          body: {
            type: 'send-otp-email',
            email: email,
            otp,
            name,
          },
        });
      } catch {
        // If email sending fails, log the code (dev fallback)
        console.info(`[OTP DEV] Your code for ${email}: ${otp}`);
      }

      setStep('otp');
      startCooldown();
      toast({ title: '📧 OTP sent!', description: `Check your email ${email} for the 4-digit code.` });
    } catch (e: any) {
      toast({ title: 'Failed to send OTP', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    await sendOtp();
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (text.length === 4) {
      setOtpDigits(text.split(''));
      otpRefs.current[3]?.focus();
    }
  };

  const verifyOtp = async () => {
    const enteredCode = otpDigits.join('');
    if (enteredCode.length < 4) {
      toast({ title: 'Enter all 4 digits', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Verify OTP from Supabase
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('otp_code', enteredCode)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        toast({ title: 'Invalid or expired OTP. Try again.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Mark as verified
      await supabase.from('otp_verifications').update({ verified: true }).eq('email', email.toLowerCase().trim());

      // Create the account
      const { error: signupError } = await signUp(email, password, name);
      if (signupError) {
        toast({ title: 'Signup Failed', description: signupError, variant: 'destructive' });
        setLoading(false);
        return;
      }

      setStep('done');
      toast({ title: '✅ Account verified and created!', description: 'Welcome to Stopy Shoes!' });
      setTimeout(() => navigate('/'), 1500);
    } catch (e: any) {
      toast({ title: 'Verification error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-10">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-2xl border p-8 shadow-sm">
            <div className="text-center mb-8">
              <img src="/favicon.ico" alt="Stopy Shoes" className="h-12 w-12 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">
                {step === 'form' ? 'Create Account' : step === 'otp' ? 'Verify Email' : 'All Done!'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {step === 'form' ? 'Join Stopy Shoes today' :
                 step === 'otp' ? `We sent a 4-digit code to ${email}` :
                 'Your account is ready'}
              </p>
            </div>

            {/* Step indicator */}
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

            {/* Step 1: Form */}
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
                    <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" required minLength={6} />
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading || password !== confirmPassword}>
                  {loading ? 'Sending OTP...' : 'Send Verification Code'}
                </Button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Enter the 4-digit code sent to</p>
                  <p className="font-semibold text-primary">{email}</p>
                </div>

                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
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
                      className="w-14 h-14 text-center text-xl font-bold border-2 rounded-xl focus:border-primary focus:outline-none transition-colors bg-background"
                    />
                  ))}
                </div>

                <Button onClick={verifyOtp} className="w-full h-11" disabled={loading || otpDigits.join('').length < 4}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
                  {resendCooldown > 0 ? (
                    <p className="text-sm text-muted-foreground">Resend in {resendCooldown}s</p>
                  ) : (
                    <button onClick={sendOtp} disabled={loading} className="text-sm text-primary font-medium hover:underline">
                      Resend OTP
                    </button>
                  )}
                  <button onClick={() => setStep('form')} className="block w-full text-xs text-muted-foreground hover:underline">
                    ← Change email
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
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

            {step === 'form' && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">OR CONTINUE WITH</span>
                  <div className="flex-1 border-t" />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => toast({ title: 'Google login coming soon' })}>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </Button>
                  <Button variant="outline" className="flex-1 h-11" onClick={() => toast({ title: 'Facebook login coming soon' })}>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </Button>
                </div>

                <p className="text-center text-sm mt-6 text-muted-foreground">
                  Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Signup;
