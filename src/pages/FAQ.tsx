import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { HelpCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const faqs = [
  { category: 'Orders', q: 'How can I place an order?', a: 'Browse products, add to cart, select your size and color, then proceed to checkout. Choose Cash on Delivery or pay online.' },
  { category: 'Orders', q: 'How do I track my order?', a: 'Go to My Page > My Orders to see your order status and tracking information in real-time.' },
  { category: 'Payment', q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD), Visa, MasterCard, JazzCash, and EasyPaisa for your convenience.' },
  { category: 'Payment', q: 'Is online payment secure?', a: 'Yes, all online transactions are secured with industry-standard SSL encryption.' },
  { category: 'Delivery', q: 'What is the delivery time?', a: 'Orders are delivered within 3-5 business days across Pakistan. Major cities receive delivery in 2-3 days.' },
  { category: 'Delivery', q: 'Do you offer free delivery?', a: 'Free delivery is available on eligible orders above a minimum amount. Check the cart page for current delivery charges.' },
  { category: 'Returns', q: 'Can I return or exchange a product?', a: 'Yes, we offer a 7-day easy return policy. The product must be unused, in original packaging with tags intact.' },
  { category: 'Products', q: 'Are all products original?', a: 'Yes, we guarantee 100% original products. All items come with our quality assurance seal.' },
  { category: 'Support', q: 'How do I contact customer support?', a: 'You can reach us via WhatsApp, email, or use the Contact Us page. We respond within 24 hours.' },
  { category: 'Account', q: 'How do I create an account?', a: 'Click Login > Sign Up, enter your email, verify with a 4-digit OTP code, and you\'re ready to shop!' },
];

const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category)))];

const FAQ = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = faqs.filter(f => {
    const matchCat = activeCategory === 'All' || f.category === activeCategory;
    const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-8 max-w-3xl">
        <PageBreadcrumb items={[{ label: 'FAQ' }]} />

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <HelpCircle className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">FAQ</h1>
            <p className="text-muted-foreground text-sm">Frequently Asked Questions</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-5 mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border">
            <HelpCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">No results found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="bg-card rounded-2xl border overflow-hidden">
            {filtered.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b last:border-0">
                <AccordionTrigger className="text-sm font-medium px-5 py-4 hover:no-underline hover:bg-muted/30 text-left">
                  <span className="flex items-start gap-3">
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide shrink-0 mt-0.5">{faq.category}</span>
                    {faq.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground px-5 pb-4 pt-0 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Still have questions?{' '}
          <a href="/contact" className="text-primary font-medium hover:underline">Contact us</a>
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default FAQ;
