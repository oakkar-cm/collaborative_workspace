import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Zap, Mail, Lock, User } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
        }}
      />
      <nav className="relative z-10 container mx-auto px-6 py-6">
        <Link to="/" className="flex items-center space-x-2 w-fit">
          <div className="w-10 h-10 bg-[#6366F1] rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-[#0F172A]">Synapse</span>
        </Link>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-card p-8">
            <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Create an account</h1>
            <p className="text-[#64748B] mb-6">Enter your details to get started</p>
            {backendOk === false && (
              <p className="text-amber-600 text-sm mb-4 bg-amber-50 p-2 rounded">
                Cannot reach backend. Start it with: <code className="bg-amber-100 px-1">cd backend && npm start</code>. Ensure MongoDB is running.
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
                      className="pl-10"
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
                      className="pl-10"
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
                    className="pl-10"
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
                    className="pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg py-2"
                aria-busy={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[#64748B]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#6366F1] font-medium hover:underline">
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
