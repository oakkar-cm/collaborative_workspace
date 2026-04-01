import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Zap, Mail, Lock, User, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { register } from '../api/endpoints/auth';
import client from '../api/client';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState(null);
  const passwordScore = Math.min(100, password.length * 20);

  useEffect(() => {
    client.get('/health')
      .then((res) => setBackendOk(res.data?.db === 'connected'))
      .catch(() => setBackendOk(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim() || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), password });
      toast.success('Account created. Please sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      const message = error.response?.data?.message
        || (error.response ? 'Registration failed' : 'Cannot reach server. Is the backend running? Set REACT_APP_BACKEND_URL (e.g. http://localhost:5000) in frontend .env and restart.');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-white to-[#EEF5FF]">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-glow absolute -left-10 top-24 h-72 w-72 rounded-full bg-[#60A5FA]/25 blur-3xl" />
        <div className="landing-glow absolute bottom-0 right-12 h-72 w-72 rounded-full bg-[#3B82F6]/20 blur-3xl" />
      </div>
      <nav className="relative z-10 px-6 py-6">
        <Link to="/" className="flex w-fit items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#60A5FA] shadow-lg shadow-blue-200/60">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-[#0F172A]">Synapse</span>
        </Link>
      </nav>

      <div className="relative z-10 grid min-h-[calc(100vh-88px)] grid-cols-1 items-center gap-8 px-6 pb-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="relative mx-auto h-[540px] max-w-[560px]">
            <div className="landing-float absolute left-10 top-14 h-24 w-44 rounded-3xl border border-white/50 bg-white/70 p-4 shadow-xl shadow-blue-200/50 backdrop-blur-md">
              <p className="text-xs text-[#64748B]">New users today</p>
              <p className="mt-1 text-2xl font-semibold text-[#2563EB]">1,512</p>
            </div>
            <div className="landing-float-slow absolute bottom-16 right-8 h-24 w-44 rounded-3xl border border-white/50 bg-white/80 p-4 shadow-xl shadow-blue-200/50 backdrop-blur-md">
              <p className="text-xs text-[#64748B]">Security score</p>
              <p className="mt-1 text-xl font-semibold text-[#2563EB]">A+</p>
            </div>
            <div className="landing-tilt absolute left-1/2 top-1/2 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-blue-100/70 bg-white/75 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-[#2563EB]">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Secure team onboarding</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-[#EFF6FF] p-3 text-sm text-[#334155]">Identity verification ready</div>
                <div className="rounded-2xl bg-[#EFF6FF] p-3 text-sm text-[#334155]">Role-based access in minutes</div>
                <div className="rounded-2xl bg-[#EFF6FF] p-3 text-sm text-[#334155]">Private workspaces by default</div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-[24px] border border-blue-100/70 bg-white/70 p-8 shadow-2xl shadow-blue-100/70 backdrop-blur-xl">
            <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Create your account</h1>
            <p className="mb-6 text-[#64748B]">Build your collaborative workspace in seconds.</p>
            {backendOk === false && (
              <p className="mb-4 rounded bg-[#EFF6FF] p-2 text-sm text-[#1D4ED8]">
                Cannot reach backend. Start it with: <code className="bg-[#DBEAFE] px-1">cd backend && npm start</code>. Ensure MongoDB is running.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 rounded-xl border-blue-100 bg-white/80 pl-10 focus-visible:ring-[#2563EB]"
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 rounded-xl border-blue-100 bg-white/80 pl-10 focus-visible:ring-[#2563EB]"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl border-blue-100 bg-white/80 pl-10 focus-visible:ring-[#2563EB]"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-blue-100 bg-white/80 pl-10 focus-visible:ring-[#2563EB]"
                    autoComplete="new-password"
                  />
                </div>
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-blue-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] transition-all"
                      style={{ width: `${passwordScore}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#64748B]">Password strength</p>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:brightness-105"
                aria-busy={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[#64748B]">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-[#2563EB] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
