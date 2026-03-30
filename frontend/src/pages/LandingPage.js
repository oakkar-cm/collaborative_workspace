import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Blocks,
  CheckCircle2,
  Layers3,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const parallaxY = Math.min(scrollY * 0.12, 70);

  const features = [
    {
      title: 'Realtime Collaboration',
      description: 'Edit, comment, and review with your team instantly across every project board.',
      icon: Layers3
    },
    {
      title: 'AI Data Insights',
      description: 'Convert activity into actionable dashboards with live progress intelligence.',
      icon: BarChart3
    },
    {
      title: 'Secure by Design',
      description: 'Enterprise-grade controls, encrypted sessions, and role-based workspace access.',
      icon: ShieldCheck
    },
    {
      title: 'Modular Workflow',
      description: 'Launch docs, tasks, files, and communication in one unified operating layer.',
      icon: Blocks
    }
  ];

  const stats = [
    { label: 'Active users', value: '120K+' },
    { label: 'Daily sync events', value: '9.8M' },
    { label: 'Avg. response time', value: '98ms' },
    { label: 'Enterprise uptime', value: '99.99%' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FBFF] via-white to-[#F3F8FF] text-[#0F172A]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 left-1/4 h-72 w-72 rounded-full bg-[#60A5FA]/25 blur-3xl" />
          <div className="absolute top-28 -right-16 h-96 w-96 rounded-full bg-[#1E3A8A]/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#93C5FD]/20 blur-3xl" />
        </div>

        <nav className="relative z-20 mx-auto flex w-full max-w-none items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#60A5FA] shadow-lg shadow-blue-300/50">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Synapse</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="rounded-full px-5 text-[#1E3A8A] hover:bg-blue-50">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              data-testid="nav-login-button"
              className="rounded-full bg-[#1E3A8A] px-5 text-white shadow-md shadow-blue-300/60 transition-all hover:bg-[#1B357C] hover:shadow-lg"
            >
              <Link to="/register">Start Free</Link>
            </Button>
          </div>
        </nav>

        <section className="relative z-10 mx-auto grid w-full max-w-none gap-10 px-6 pb-20 pt-10 lg:grid-cols-2 lg:items-center lg:pb-28 lg:pt-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/70 px-4 py-2 text-sm text-[#1E3A8A] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Modern collaborative operating system
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Build faster with a{' '}
              <span className="bg-gradient-to-r from-[#1E3A8A] to-[#60A5FA] bg-clip-text text-transparent">
                premium AI workspace
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#475569] sm:text-xl">
              A bright, next-generation platform for teams to plan, collaborate, and ship with precision.
              Minimal UI, fluid interactions, and enterprise trust in every click.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                data-testid="hero-get-started-button"
                className="group rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-8 py-6 text-base text-white shadow-lg shadow-blue-300/60 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Link to="/register">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-blue-200 px-8 py-6 text-[#1E3A8A] hover:bg-blue-50">
                <Link to="/login">Live Demo</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto h-[480px] w-full max-w-[560px] [perspective:1200px]">
            <div
              className="landing-orbit absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-100/70"
              style={{ transform: `translate(-50%, calc(-50% + ${parallaxY * 0.3}px))` }}
            />
            <div
              className="landing-float-slow absolute left-10 top-4 h-24 w-32 rounded-2xl border border-white/50 bg-white/70 p-4 shadow-xl shadow-blue-200/40 backdrop-blur-md"
              style={{ transform: `translateY(${parallaxY * -0.15}px)` }}
            >
              <p className="text-xs text-[#64748B]">Engagement</p>
              <p className="mt-2 text-2xl font-semibold text-[#1E3A8A]">+42%</p>
            </div>
            <div
              className="landing-float absolute bottom-10 right-6 h-28 w-40 rounded-2xl border border-white/50 bg-white/80 p-4 shadow-xl shadow-blue-200/40 backdrop-blur-md"
              style={{ transform: `translateY(${parallaxY * 0.12}px)` }}
            >
              <p className="text-xs text-[#64748B]">Velocity</p>
              <div className="mt-3 h-2 rounded-full bg-blue-100">
                <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#60A5FA]" />
              </div>
            </div>
            <div
              className="landing-tilt absolute left-1/2 top-1/2 w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-blue-100/70 bg-white/80 p-4 shadow-2xl shadow-blue-200/60 backdrop-blur-xl"
              style={{
                transform: `translate(-50%, calc(-50% + ${parallaxY * 0.45}px)) rotateX(8deg) rotateY(-12deg)`
              }}
            >
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-blue-100 bg-white px-4 py-3">
                <p className="text-sm font-medium text-[#334155]">Realtime Workspace</p>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-[#1E3A8A]">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gradient-to-b from-blue-50 to-white p-4">
                  <p className="text-xs text-[#64748B]">Pipeline</p>
                  <p className="mt-2 text-xl font-semibold text-[#1E3A8A]">$2.4M</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-b from-blue-50 to-white p-4">
                  <p className="text-xs text-[#64748B]">Conversion</p>
                  <p className="mt-2 text-xl font-semibold text-[#1E3A8A]">63.9%</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-gradient-to-r from-[#DBEAFE] to-[#EFF6FF] p-4">
                  <div className="h-20 rounded-xl bg-white/70 p-3">
                    <div className="flex h-full items-end gap-2">
                      <div className="h-8 w-5 rounded-md bg-blue-200" />
                      <div className="h-12 w-5 rounded-md bg-blue-300" />
                      <div className="h-16 w-5 rounded-md bg-blue-500" />
                      <div className="h-11 w-5 rounded-md bg-blue-300" />
                      <div className="h-14 w-5 rounded-md bg-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-none px-6 py-16 lg:py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything teams need in one clean flow</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[#64748B]">
            Purpose-built modules with subtle glass styling, soft depth, and motion that feels smooth and intentional.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group rounded-3xl border border-blue-100/70 bg-white/65 p-6 shadow-lg shadow-blue-100/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] text-[#1E3A8A]">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{feature.description}</p>
              <div className="mt-5 h-1 w-12 rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#60A5FA] opacity-70 transition-all group-hover:w-20" />
              <span className="sr-only">feature-{index}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-none items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Immersive 3D showcase with live context</h2>
          <p className="mt-5 text-[#64748B]">
            The center canvas combines interactive dashboard layers with floating system cards to create a real
            product feel ready for production previews and demos.
          </p>
          <ul className="mt-8 space-y-4">
            {['Scroll-responsive depth', 'Lightweight 3D illusion', 'Soft reflections and glows'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[#334155]">
                <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative h-[420px] rounded-[28px] border border-blue-100 bg-gradient-to-br from-[#EFF6FF] via-white to-[#DBEAFE] p-6 shadow-2xl shadow-blue-200/60">
          <div className="landing-glow absolute -top-12 right-6 h-40 w-40 rounded-full bg-[#60A5FA]/35 blur-3xl" />
          <div
            className="landing-tilt absolute left-1/2 top-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-xl backdrop-blur-xl"
            style={{
              transform: `translate(-50%, calc(-50% + ${parallaxY * 0.35}px)) rotateX(8deg) rotateY(-8deg)`
            }}
          >
            <div className="rounded-2xl bg-[#F8FBFF] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-[#64748B]">Revenue Overview</p>
                <p className="text-xs font-medium text-[#1E3A8A]">+18.4%</p>
              </div>
              <div className="grid grid-cols-6 items-end gap-2">
                {[35, 44, 58, 49, 71, 82].map((height) => (
                  <div key={height} className="rounded-md bg-gradient-to-t from-[#1E3A8A] to-[#60A5FA]" style={{ height: `${height}px` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="landing-float absolute left-6 top-8 w-40 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur-md">
            <p className="text-xs text-[#64748B]">Nodes synced</p>
            <p className="mt-1 text-lg font-semibold text-[#1E3A8A]">14,892</p>
          </div>
          <div className="landing-float-slow absolute bottom-8 right-7 w-44 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-lg backdrop-blur-md">
            <p className="text-xs text-[#64748B]">System confidence</p>
            <p className="mt-1 text-lg font-semibold text-[#1E3A8A]">97.2%</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-none px-6 py-14 lg:py-20">
        <div className="grid grid-cols-2 gap-4 rounded-3xl border border-blue-100 bg-white/70 p-6 shadow-lg shadow-blue-100/60 backdrop-blur sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/70 p-4 text-center">
              <p className="text-2xl font-bold text-[#1E3A8A] sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-[#64748B]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-none px-6 pb-16 pt-8 lg:pb-24">
        <div className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] p-10 text-center shadow-2xl shadow-blue-300/50 sm:p-14">
          <div className="landing-glow absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-[#93C5FD]/45 blur-3xl" />
          <h2 className="relative text-3xl font-bold text-white sm:text-4xl">Ready to launch your next breakthrough?</h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-white/90">
            Move from concept to execution in one premium workspace designed for speed, clarity, and trust.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              data-testid="cta-get-started-button"
              className="rounded-full bg-white px-8 py-6 text-[#1E3A8A] shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Link to="/register">Start Building</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/60 bg-white/10 px-8 py-6 text-white hover:bg-white/20">
              <Link to="/login">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-blue-100 bg-white/75 py-7">
        <div className="mx-auto flex w-full max-w-none flex-col items-center justify-between gap-3 px-6 text-sm text-[#64748B] sm:flex-row">
          <p>© 2026 Synapse. Crafted for modern high-performance teams.</p>
          <p>Fast. Secure. Future-ready.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
