import { useState, useEffect } from 'react';
import { Shield, Code2, Smartphone, Brain, Cloud, Palette, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/layout/BottomNav';
import { DEV_INFO_KEY, DEFAULT_DEV_INFO } from '@/components/SecretDevDashboard';

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
  const [info, setInfo] = useState(DEFAULT_DEV_INFO);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEV_INFO_KEY);
      if (stored) setInfo({ ...DEFAULT_DEV_INFO, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const initials = info.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const stats = [
    { label: 'Projects', value: info.projects },
    { label: 'Clients', value: info.clients },
    { label: 'Experience', value: info.experience },
    { label: 'Technologies', value: info.technologies },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <main className="container py-10 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center space-y-4 mb-12">
          <div className="relative inline-block">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto shadow-xl shadow-primary/25">
              <span className="text-4xl font-black text-white">{initials}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">✓</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight">{info.name}</h1>
            <p className="text-primary font-semibold text-lg">{info.handle}</p>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto leading-relaxed">
              {info.tagline}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge className="bg-green-100 text-green-800 border-green-200">{info.availabilityBadge}</Badge>
            <Badge variant="outline">{info.location} 🇵🇰</Badge>
            <Badge variant="outline">Remote Worldwide</Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map(s => (
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
              <p className="text-sm text-muted-foreground">{info.origin_story}</p>
              <p className="text-xs text-primary font-medium mt-2">{info.copyright}</p>
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
                Email {info.name.split(' ')[0]}
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

      </main>
      <BottomNav />
    </div>
  );
};

export default DeveloperPage;
