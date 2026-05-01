

import BottomNav from '@/components/layout/BottomNav';

const ReturnPolicy = () => (
  <div className="min-h-screen bg-background pb-16 md:pb-0">
    
    <main className="container py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Return & Refund Policy</h1>
      <div className="bg-card rounded-xl border p-6 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold text-lg mb-2">📦 Return Eligibility</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Items can be returned within <strong>7 days</strong> of delivery.</li>
            <li>Product must be unused, unworn, and in original packaging.</li>
            <li>Tags and labels must be intact.</li>
            <li>Customized or personalized items cannot be returned.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-bold text-lg mb-2">🔄 Return Process</h2>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Go to <strong>My Orders</strong> and select the order.</li>
            <li>Click <strong>Request Return</strong> and provide reason.</li>
            <li>Upload photos of the product.</li>
            <li>Our team will review within 24-48 hours.</li>
            <li>If approved, schedule a pickup or ship back.</li>
          </ol>
        </section>
        <section>
          <h2 className="font-bold text-lg mb-2">💰 Refund</h2>
          <p className="text-muted-foreground">Refunds are processed within 5-7 business days after receiving the returned item. COD orders will be refunded via bank transfer or EasyPaisa/JazzCash.</p>
        </section>
        <section>
          <h2 className="font-bold text-lg mb-2">🛡️ Warranty Claims</h2>
          <p className="text-muted-foreground">Products with manufacturing defects can be claimed within 30 days. Contact us via chat or WhatsApp with order details and photos.</p>
        </section>
      </div>
    </main>
    
    <BottomNav />
  </div>
);

export default ReturnPolicy;
