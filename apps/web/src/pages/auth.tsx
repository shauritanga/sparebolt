import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bolt } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';
  const { login, loginWithOtp, loading } = useAuthStore();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugCode, setDebugCode] = useState('');

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast.success('Welcome back');
      void navigate(from);
    } catch {
      toast.error('Invalid credentials');
    }
  };

  const requestOtp = async () => {
    try {
      const { data } = await api.post('/auth/otp/request', { phone });
      setOtpSent(true);
      if (data.debugCode) setDebugCode(data.debugCode);
      toast.success('OTP sent');
    } catch {
      toast.error('Failed to send OTP');
    }
  };

  const onOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithOtp(phone, otp);
      toast.success('Logged in');
      void navigate(from);
    } catch {
      toast.error('Invalid OTP');
    }
  };

  return (
    <AuthCard title={t('login')}>
      <div className="mb-4 flex rounded-xl bg-steel-100 p-1">
        <button
          type="button"
          className={`flex-1 rounded-lg py-2 text-sm font-semibold cursor-pointer ${
            mode === 'password' ? 'bg-white shadow-sm' : 'text-steel-500'
          }`}
          onClick={() => setMode('password')}
        >
          Email
        </button>
        <button
          type="button"
          className={`flex-1 rounded-lg py-2 text-sm font-semibold cursor-pointer ${
            mode === 'otp' ? 'bg-white shadow-sm' : 'text-steel-500'
          }`}
          onClick={() => setMode('otp')}
        >
          Phone OTP
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={(e) => void onPassword(e)} className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            {t('login')}
          </Button>
        </form>
      ) : (
        <form onSubmit={(e) => void onOtp(e)} className="space-y-3">
          <Input
            type="tel"
            placeholder="+2557…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {!otpSent ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => void requestOtp()}
            >
              Send OTP
            </Button>
          ) : (
            <>
              <Input
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              {debugCode && (
                <p className="text-xs text-steel-500">Dev OTP: {debugCode}</p>
              )}
              <Button type="submit" className="w-full" loading={loading}>
                Verify & login
              </Button>
            </>
          )}
        </form>
      )}

      <p className="mt-4 text-center text-sm text-steel-500">
        Demo: customer@sparebolt.tz / password123
      </p>
      <p className="mt-2 text-center text-sm">
        No account?{' '}
        <Link to="/auth/register" className="font-semibold text-bolt-700">
          {t('register')}
        </Link>
      </p>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form);
      toast.success('Account created');
      void navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || 'Registration failed');
    }
  };

  return (
    <AuthCard title={t('register')}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="First name"
            value={form.firstName}
            onChange={(e) =>
              setForm((f) => ({ ...f, firstName: e.target.value }))
            }
            required
          />
          <Input
            placeholder="Last name"
            value={form.lastName}
            onChange={(e) =>
              setForm((f) => ({ ...f, lastName: e.target.value }))
            }
            required
          />
        </div>
        <Input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Input
          type="tel"
          placeholder="Phone +255…"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          type="password"
          placeholder="Password (min 6)"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
          minLength={6}
        />
        <Button type="submit" className="w-full" loading={loading}>
          {t('register')}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        Have an account?{' '}
        <Link to="/auth/login" className="font-semibold text-bolt-700">
          {t('login')}
        </Link>
      </p>
    </AuthCard>
  );
}

function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bolt-700 text-white shadow">
          <Bolt className="h-6 w-6 fill-current" />
        </span>
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
      </div>
      <div className="rounded-3xl border border-steel-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
