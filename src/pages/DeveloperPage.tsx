import { Shield, Code2, Smartphone, Brain, Cloud, Palette, ExternalLink, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/layout/BottomNav';

const STATS = [
  { label: 'Projects', value: '50+' },
  { label: 'Clients', value: '30+' },
  { label: 'Experience', value: '5+ Yrs' },
  { label: 'Technologies', value: '20+' },
];

const SERVICES = [
  { icon: Code2, label: 'E-Commerce Development', desc: 'Full-stack storefronts with AI & real-time features' },
  { icon: Smartphone, label: 'Mobile App Development', desc: 'React Native & Expo cross-platform apps' },
  { icon: Brain, label: 'AI Integration', desc: 'LLM-powered chatbots, automation & analytics' },
  { icon: Cloud, label: 'Cloud & Backend', desc: 'Supabase, Firebase, Node.js scalable APIs' },
  { icon: Palette, label: 'UI/UX Design', desc: 'Pixel-perfect, mobile-first interfaces' },
];

const TECH_STACK = [
  'React', 'TypeScript', 'Node.js', 'Supabase', 'Tailwind CSS',
  'Next.js', 'React Native', 'PostgreSQL', 'OpenAI', 'Framer Motion',
];

const DeveloperPage = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Locked header banner */}
      <div className="bg-primary text-primary-foreground">
        <div className="container flex items-center justify-between py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>Developer Profile — Hard-Coded · Non-Editable from Admin</span>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-[10px]">PROTECTED</Badge>
        </div>
      </div>

      <main className="container py-10 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center space-y-4 mb-12">
          <div className="relative inline-block">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto shadow-xl shadow-primary/25">
              <span className="text-4xl font-black text-white">MA</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">✓</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight">Muhammad Asad Ali</h1>
            <p className="text-primary font-semibold text-lg">ASDEVOLPER</p>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto leading-relaxed">
              Full-Stack Web & Mobile Developer specializing in AI-powered e-commerce platforms,
              scalable cloud architectures, and intelligent automation systems.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge className="bg-green-100 text-green-800 border-green-200">Available for Projects</Badge>
            <Badge variant="outline">Pakistan 🇵🇰</Badge>
            <Badge variant="outline">Remote Worldwide</Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {STATS.map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
              <p className="text-2xl font-black text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* This Project Credit */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base mb-1">Original Creator — Stopy Shoes</h3>
              <p className="text-sm text-muted-foreground">
                This platform (Stopy Shoes — Universal AI Commerce Engine) was entirely designed, developed,
                and deployed by <strong className="text-foreground">Muhammad Asad Ali (ASDEVOLPER)</strong>.
                Including all AI modules, e-commerce logic, admin dashboard, and real-time integrations.
              </p>
              <p className="text-xs text-primary font-medium mt-2">
                © 2024–2026 Muhammad Asad Ali · All Rights Reserved
              </p>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">Services</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {SERVICES.map(s => (
              <div key={s.label} className="bg-card border rounded-xl p-4 flex gap-3 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map(t => (
              <Badge key={t} variant="secondary" className="text-sm px-3 py-1">{t}</Badge>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card border rounded-xl p-6 text-center space-y-4">
          <h2 className="text-xl font-bold">Get In Touch</h2>
          <p className="text-sm text-muted-foreground">
            Looking for a skilled developer for your next project?
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="mailto:asdevolper@gmail.com">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
                Email Muhammad Asad
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </a>
            <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-accent transition">
                WhatsApp
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </a>
          </div>
        </div>

        {/* Lock notice */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            This page is hard-coded and protected from Admin UI and AI Manager edits.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default DeveloperPage;
