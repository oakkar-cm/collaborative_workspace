import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Zap, Mail, Lock, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { login } from '../api/endpoints/auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      toast.success(data.message || 'Login successful');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error.response?.data?.message
        || (error.response ? 'Login failed' : 'Cannot reach server. Is the backend running?');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F8FBFF] via-white to-[#EEF5FF]">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-glow absolute -left-10 top-20 h-64 w-64 rounded-full bg-[#60A5FA]/25 blur-3xl" />
        <div className="landing-glow absolute bottom-0 right-10 h-72 w-72 rounded-full bg-[#3B82F6]/20 blur-3xl" />
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
          <div className="relative mx-auto h-[520px] max-w-[560px]">
            <div className="landing-orbit absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-100/70" />
            <div className="landing-float absolute left-6 top-16 h-28 w-44 rounded-3xl border border-white/50 bg-white/70 p-5 shadow-xl shadow-blue-200/50 backdrop-blur-md">
              <p className="text-xs text-[#64748B]">Realtime Sync</p>
              <p className="mt-2 text-2xl font-semibold text-[#2563EB]">99.99%</p>
            </div>
            <div className="landing-float-slow absolute bottom-20 right-8 h-24 w-40 rounded-3xl border border-white/50 bg-white/75 p-4 shadow-xl shadow-blue-200/50 backdrop-blur-md">
              <p className="text-xs text-[#64748B]">Teams Online</p>
              <p className="mt-2 text-xl font-semibold text-[#2563EB]">2,438</p>
            </div>
            <div className="landing-tilt absolute left-1/2 top-1/2 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-blue-100/70 bg-white/75 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-[#334155]">Workspace Intelligence</p>
                <Sparkles className="h-4 w-4 text-[#2563EB]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gradient-to-b from-[#EFF6FF] to-white p-4">
                  <p className="text-xs text-[#64748B]">Tasks closed</p>
                  <p className="mt-2 text-lg font-semibold text-[#2563EB]">1,204</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-b from-[#EFF6FF] to-white p-4">
                  <p className="text-xs text-[#64748B]">Velocity</p>
                  <p className="mt-2 text-lg font-semibold text-[#2563EB]">+28%</p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-blue-100">
                <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-[24px] border border-blue-100/70 bg-white/70 p-8 shadow-2xl shadow-blue-100/70 backdrop-blur-xl">
            <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Welcome back</h1>
            <p className="mb-6 text-[#64748B]">Sign in to continue to your collaborative workspace.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-blue-100 bg-white/80 pl-10 focus-visible:ring-[#2563EB]"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:brightness-105"
                aria-busy={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[#64748B]">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-[#2563EB] hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
