import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, MessageSquare, CheckSquare, Users, Zap, Lock, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div 
          className="absolute inset-0 z-0" 
          style={{
            background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)'
          }}
        />
        
        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#6366F1] rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-[#0F172A]">Synapse</span>
            </div>
            <Button
              onClick={handleLogin}
              data-testid="nav-login-button"
              className="bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-full px-6 py-2 transition-all active:scale-95"
            >
              Sign In
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F172A] mb-6 leading-tight">
              Your Team's
              <span className="text-[#6366F1]"> Unified </span>
              Workspace
            </h1>
            <p className="text-lg sm:text-xl text-[#64748B] mb-10 max-w-2xl mx-auto">
              Collaborate in real-time with shared documents, instant messaging, task management, and file sharing—all in one seamless platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={handleLogin}
                data-testid="hero-get-started-button"
                className="bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-full px-8 py-6 text-lg transition-all active:scale-95 flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#E2E8F0]">
              <img
                src="https://images.unsplash.com/photo-1769541607705-3b3c5095679b?crop=entropy&cs=srgb&fm=jpg&q=85"
                alt="Collaborative workspace"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-4">
            Everything You Need to Collaborate
          </h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            Stop switching between tools. Synapse brings all your collaboration needs into one powerful platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-card hover:shadow-card-hover hover:border-[#6366F1] hover:scale-[1.03] transition-all duration-200">
            <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-[#6366F1]" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Real-Time Editing</h3>
            <p className="text-[#64748B]">
              Edit documents simultaneously with your team. See changes instantly as they happen.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-card hover:shadow-card-hover hover:border-[#6366F1] hover:scale-[1.03] transition-all duration-200">
            <div className="w-12 h-12 bg-[#FEF3F2] rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-[#F43F5E]" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Instant Chat</h3>
            <p className="text-[#64748B]">
              Communicate with your team in real-time. Share ideas and stay connected.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-card hover:shadow-card-hover hover:border-[#6366F1] hover:scale-[1.03] transition-all duration-200">
            <div className="w-12 h-12 bg-[#ECFDF5] rounded-lg flex items-center justify-center mb-4">
              <CheckSquare className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Task Management</h3>
            <p className="text-[#64748B]">
              Create, assign, and track tasks. Keep everyone aligned on project goals.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-card hover:shadow-card-hover hover:border-[#6366F1] hover:scale-[1.03] transition-all duration-200">
            <div className="w-12 h-12 bg-[#FEF3C7] rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">File Sharing</h3>
            <p className="text-[#64748B]">
              Upload and share files securely. Access your documents from anywhere.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-6">
                Built for Modern Teams
              </h2>
              <p className="text-lg text-[#64748B] mb-8">
                Whether you're a remote team, a startup, or a large organization, Synapse adapts to your workflow.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0F172A] mb-1">Multi-User Collaboration</h4>
                    <p className="text-[#64748B]">Work together seamlessly with unlimited team members</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#FEF3F2] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-[#F43F5E]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0F172A] mb-1">Secure & Private</h4>
                    <p className="text-[#64748B]">Your data is encrypted and protected at all times</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#ECFDF5] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0F172A] mb-1">Lightning Fast</h4>
                    <p className="text-[#64748B]">Real-time updates with zero lag or delays</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1758691736975-9f7f643d178e?crop=entropy&cs=srgb&fm=jpg&q=85"
                alt="Team collaboration"
                className="rounded-2xl shadow-xl border border-[#E2E8F0]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-3xl p-12 lg:p-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of teams already collaborating better with Synapse.
          </p>
          <Button
            onClick={handleLogin}
            data-testid="cta-get-started-button"
            className="bg-white text-[#6366F1] hover:bg-gray-50 rounded-full px-10 py-6 text-lg font-semibold transition-all active:scale-95"
          >
            Start Collaborating Now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-[#64748B]">
            © 2025 Synapse. Built for seamless collaboration.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
