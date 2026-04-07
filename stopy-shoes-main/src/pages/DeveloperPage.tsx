import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const DeveloperPage = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container py-10">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-4xl font-black text-primary">AS</span>
          </div>
          <h1 className="text-3xl font-black">ASDEVOLPER</h1>
          <p className="text-muted-foreground text-lg">
            Full Stack Web & App Developer specializing in modern e-commerce solutions, AI-powered applications, and scalable web platforms.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Projects', value: '50+' },
              { label: 'Clients', value: '30+' },
              { label: 'Experience', value: '5+ Years' },
              { label: 'Technologies', value: '20+' },
            ].map(s => (
              <div key={s.label} className="bg-card border rounded-xl p-4">
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-6 text-left space-y-3">
            <h3 className="font-bold">Services</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>🛒 E-Commerce Website Development</li>
              <li>📱 Mobile App Development</li>
              <li>🤖 AI Integration & Automation</li>
              <li>☁️ Cloud Solutions & Backend</li>
              <li>🎨 UI/UX Design</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            This website (Stopy Shoes) was designed and developed by ASDEVOLPER.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default DeveloperPage;
