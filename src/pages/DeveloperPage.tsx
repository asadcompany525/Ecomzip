import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ExternalLink, ArrowLeft, Mail, MessageCircle, Github, Instagram, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/layout/BottomNav';
import { DEV_INFO_KEY, DEFAULT_DEV_INFO } from '@/components/SecretDevDashboard';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_TECH_STACK = [
  'React', 'TypeScript', 'Node.js', 'Supabase', 'Tailwind CSS',
  'Next.js', 'React Native', 'PostgreSQL', 'OpenAI', 'Framer Motion',
];

const DEFAULT_SERVICES = [
  { label: 'E-Commerce Development', desc: 'Full-stack storefronts with AI & real-time features' },
  { label: 'Mobile App Development', desc: 'React Native & Expo cross-platform apps' },
  { label: 'AI Integration', desc: 'LLM-powered chatbots, automation & analytics' },
  { label: 'Cloud & Backend', desc: 'Supabase, Firebase, Node.js scalable APIs' },
  { label: 'UI/UX Design', desc: 'Pixel-perfect, mobile-first interfaces' },
];

const DeveloperPage = () => {
  const [info, setInfo] = useState<typeof DEFAULT_DEV_INFO>(DEFAULT_DEV_INFO);
  const [techStack, setTechStack] = useState<string[]>(DEFAULT_TECH_STACK);
  const [services, setServices] = useState<{ label: string; desc: string }[]>(DEFAULT_SERVICES);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Load developer info from localStorage first (instant)
    try {
      const stored = localStorage.getItem(DEV_INFO_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setInfo({ ...DEFAULT_DEV_INFO, ...parsed, customLinks: parsed.customLinks || [] });
      }
    } catch {}

    // 2. Fetch all developer settings from Supabase
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['developer_page', 'developer_tech_stack', 'developer_services'])
      .then(({ data }) => {
        (data || []).forEach((s: any) => {
          if (s.key === 'developer_page' && s.value) {
            const v = s.value as any;
            const merged = { ...DEFAULT_DEV_INFO, ...v, customLinks: v.customLinks || [] };
            setInfo(merged);
            localStorage.setItem(DEV_INFO_KEY, JSON.stringify(merged));
          }
          if (s.key === 'developer_tech_stack' && Array.isArray(s.value)) {
            setTechStack(s.value as string[]);
          }
          if (s.key === 'developer_services' && Array.isArray(s.value)) {
            setServices(s.value as { label: string; desc: string }[]);
          }
        });
      });
  }, []);

  const initials = info.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const stats = [
    { label: 'Projects', value: info.projects },
    { label: 'Clients', value: info.clients },
    { label: 'Experience', value: info.experience },
    { label: 'Technologies', value: info.technologies },
  ];

  const customLinks: { title: string; url: string }[] = (info as any).customLinks || [];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">

      {/* Compact breadcrumb header — no main site header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-3 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1">
            <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/')}>Home</span>
            <span>/</span>
            <span className="text-foreground font-medium">Developer Portal</span>
          </nav>
          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{info.availabilityBadge}</Badge>
        </div>
      </header>

      <main className="container py-10 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center space-y-4 mb-12">
          <div className="relative inline-block">
            {(info as any).asLogoUrl ? (
              <img
                src={(info as any).asLogoUrl}
                alt="AS Logo"
                className="h-28 w-28 rounded-full object-cover mx-auto shadow-xl border-4 border-primary/20"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto shadow-xl shadow-primary/25">
                <span className="text-4xl font-black text-white">{initials}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">✓</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight">{info.name}</h1>
            <p className="text-primary font-semibold text-lg">{info.handle}</p>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto leading-relaxed">{info.tagline}</p>
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
              <h3 className="font-bold text-base mb-1">Original Creator — E Commerce</h3>
              <p className="text-sm text-muted-foreground">{info.origin_story}</p>
              <p className="text-xs text-primary font-medium mt-2">{info.copyright}</p>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">Services</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {services.map((s, i) => (
              <div key={i} className="bg-card border rounded-xl p-4 flex gap-3 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-lg">
                  ✦
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
            {techStack.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{t}</Badge>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-center">Get In Touch</h2>
          <p className="text-sm text-muted-foreground text-center">Looking for a skilled developer for your next project?</p>

          <div className="flex gap-3 justify-center flex-wrap">
            {(info as any).email && (
              <a href={`mailto:${(info as any).email}`}>
                <Button className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email Me
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
            {(info as any).whatsapp && (
              <a href={`https://wa.me/${(info as any).whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
          </div>

          {/* Social Links */}
          {((info as any).github || (info as any).instagram || (info as any).linkedin) && (
            <div className="flex gap-3 justify-center pt-2 border-t flex-wrap">
              {(info as any).github && (
                <a href={(info as any).github} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon"><Github className="h-5 w-5" /></Button>
                </a>
              )}
              {(info as any).instagram && (
                <a href={(info as any).instagram} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon"><Instagram className="h-5 w-5" /></Button>
                </a>
              )}
              {(info as any).linkedin && (
                <a href={(info as any).linkedin} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon"><Linkedin className="h-5 w-5" /></Button>
                </a>
              )}
            </div>
          )}

          {/* Dynamic Custom Links */}
          {customLinks.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center mb-3">More Links</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {customLinks.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {link.title}
                    </Button>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Website
          </Button>
        </div>

      </main>
      <BottomNav />
    </div>
  );
};

export default DeveloperPage;
