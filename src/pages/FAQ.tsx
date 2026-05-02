import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


import BottomNav from '@/components/layout/BottomNav';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';

const faqs = [
  { q: 'How can I place an order?', a: 'Browse products, add to cart, select your size and color, then proceed to checkout. Choose Cash on Delivery or pay online.' },
  { q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD), Visa, MasterCard, JazzCash, and EasyPaisa.' },
  { q: 'What is the delivery time?', a: 'Orders are delivered within 3-5 business days across Pakistan. Major cities receive delivery in 2-3 days.' },
  { q: 'Can I return or exchange a product?', a: 'Yes, we offer a 7-day easy return policy. The product must be unused and in original packaging.' },
  { q: 'How do I track my order?', a: 'Go to My Page > My Orders to see your order status and tracking information.' },
  { q: 'Do you offer free delivery?', a: 'Free delivery is available on eligible orders. Check the cart page for delivery charges.' },
  { q: 'How do I contact customer support?', a: 'You can reach us via WhatsApp at +92 300 1234567, email at support@ecommerce.store, or use the Contact Us page.' },
  { q: 'Are all products original?', a: 'Yes, we guarantee 100% original products. All items come with quality assurance.' },
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      
      <main className="container py-8 max-w-3xl">
        <PageBreadcrumb items={[{ label: 'FAQ' }]} />
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">Find answers to common questions about our store.</p>
        <Accordion type="single" collapsible className="bg-card rounded-2xl border p-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-sm font-medium px-4">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground px-4">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default FAQ;
