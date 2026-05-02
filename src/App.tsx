import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AIChatWidget from "@/components/chat/AIChatWidget";
import AbandonedCartRecovery from "@/components/AbandonedCartRecovery";
import StopyLoader from "@/components/StopyLoader";

const Index            = lazy(() => import("./pages/Index"));
const Products         = lazy(() => import("./pages/Products"));
const ProductDetail    = lazy(() => import("./pages/ProductDetail"));
const Cart             = lazy(() => import("./pages/Cart"));
const Checkout         = lazy(() => import("./pages/Checkout"));
const OrderSuccess     = lazy(() => import("./pages/OrderSuccess"));
const Wishlist         = lazy(() => import("./pages/Wishlist"));
const Login            = lazy(() => import("./pages/Login"));
const Signup           = lazy(() => import("./pages/Signup"));
const NewArrivals      = lazy(() => import("./pages/NewArrivals"));
const DiscountItems    = lazy(() => import("./pages/DiscountItems"));
const FlashSalePage    = lazy(() => import("./pages/FlashSalePage"));
const MyPage           = lazy(() => import("./pages/MyPage"));
const MyOrders         = lazy(() => import("./pages/MyOrders"));
const MyAddresses      = lazy(() => import("./pages/MyAddresses"));
const MyReturns        = lazy(() => import("./pages/MyReturns"));
const MyReviews        = lazy(() => import("./pages/MyReviews"));
const MySettings       = lazy(() => import("./pages/MySettings"));
const TrackOrder       = lazy(() => import("./pages/TrackOrder"));
const ReturnPolicy     = lazy(() => import("./pages/ReturnPolicy"));
const Contact          = lazy(() => import("./pages/Contact"));
const FAQ              = lazy(() => import("./pages/FAQ"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const DeveloperPage    = lazy(() => import("./pages/DeveloperPage"));
const Notifications    = lazy(() => import("./pages/Notifications"));

const AdminLogin          = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout         = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard      = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts       = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories     = lazy(() => import("./pages/admin/AdminCategories"));
const AdminOrders         = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCustomers      = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminBanners        = lazy(() => import("./pages/admin/AdminBanners"));
const AdminPromos         = lazy(() => import("./pages/admin/AdminPromos"));
const AdminReturns        = lazy(() => import("./pages/admin/AdminClaimsReturns"));
const AdminChat           = lazy(() => import("./pages/admin/AdminChat"));
const AdminReviews        = lazy(() => import("./pages/admin/AdminReviews"));
const AdminReports        = lazy(() => import("./pages/admin/AdminReports"));
const AdminStockAlerts    = lazy(() => import("./pages/admin/AdminStockAlerts"));
const AdminSettings       = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPayments       = lazy(() => import("./pages/admin/AdminPayments"));
const AdminTodayOrders    = lazy(() => import("./pages/admin/AdminTodayOrders"));
const AdminDelivery       = lazy(() => import("./pages/admin/AdminDelivery"));
const AdminActivity       = lazy(() => import("./pages/admin/AdminActivity"));
const AdminPaymentMethods = lazy(() => import("./pages/admin/AdminPaymentMethods"));
const AdminAiDiscounts    = lazy(() => import("./pages/admin/AdminAiDiscounts"));
const AdminProductAnalytics = lazy(() => import("./pages/admin/AdminProductAnalytics"));
const AdminOrderChecklist = lazy(() => import("./pages/admin/AdminOrderChecklist"));
const AdminFormGenerator  = lazy(() => import("./pages/admin/AdminFormGenerator"));
const AdminCityManager    = lazy(() => import("./pages/admin/AdminCityManager"));
const AdminAiHelper       = lazy(() => import("./pages/admin/AdminAiHelper"));
const AdminInventoryInsights = lazy(() => import("./pages/admin/AdminInventoryInsights"));
const AdminAiSiteManager  = lazy(() => import("./pages/admin/AdminAiSiteManager"));
const AdminAiBannerCreator = lazy(() => import("./pages/admin/AdminAiBannerCreator"));
const AdminAiBulkCreator  = lazy(() => import("./pages/admin/AdminAiBulkCreator"));
const AdminAiGlobalManager = lazy(() => import("./pages/admin/AdminAiGlobalManager"));
const AdminStaff          = lazy(() => import("./pages/admin/AdminStaff"));
const AdminStaffPerformance = lazy(() => import("./pages/admin/AdminStaffPerformance"));
const AdminAiFraudDetector = lazy(() => import("./pages/admin/AdminAiFraudDetector"));
const AdminAiSalesPredictor = lazy(() => import("./pages/admin/AdminAiSalesPredictor"));
const AdminAiMarketingHub = lazy(() => import("./pages/admin/AdminAiMarketingHub"));
const AdminAiFeedbackAnalyzer = lazy(() => import("./pages/admin/AdminAiFeedbackAnalyzer"));
const AdminAiPriceIntelligence = lazy(() => import("./pages/admin/AdminAiPriceIntelligence"));
const AdminTrendPredictor = lazy(() => import("./pages/admin/AdminTrendPredictor"));
const AdminPricingEngine  = lazy(() => import("./pages/admin/AdminPricingEngine"));
const AdminLoyaltyHeatmap = lazy(() => import("./pages/admin/AdminLoyaltyHeatmap"));
const AdminSearchLogs     = lazy(() => import("./pages/admin/AdminSearchLogs"));
const AdminNewsletter     = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminContactMessages = lazy(() => import("./pages/admin/AdminContactMessages"));
const AdminClaimsReturns  = lazy(() => import("./pages/admin/AdminClaimsReturns"));
const AdminAiVirtualTryon = lazy(() => import("./pages/admin/AdminAiVirtualTryon"));
const AdminAiVoice        = lazy(() => import("./pages/admin/AdminAiVoice"));
const AdminAiSizeAdvisor  = lazy(() => import("./pages/admin/AdminAiSizeAdvisor"));
const AdminFinanceLedger  = lazy(() => import("./pages/admin/AdminFinanceLedger"));
const AdminStaffSalary    = lazy(() => import("./pages/admin/AdminStaffSalary"));
const AdminTechLogs       = lazy(() => import("./pages/admin/AdminTechLogs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const SiteBrandingLoader = () => {
  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['site_branding', 'logo', 'site_title']).then(({ data }) => {
      if (!data) return;
      const map: Record<string, any> = {};
      data.forEach(row => { map[row.key] = row.value; });
      const title = (typeof map.site_title === 'string' && map.site_title) || (map.logo?.name) || (map.site_branding?.title);
      if (title) document.title = title;
      const favicon = (map.logo?.url) || (map.site_branding?.favicon);
      if (favicon) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = favicon;
      }
    });
  }, []);
  return null;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isStaff, loading } = useAuth();
  if (loading) return <StopyLoader fullScreen />;
  if (!isAdmin && !isStaff) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

const PageLoader = () => <StopyLoader fullScreen />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <SiteBrandingLoader />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success/:id" element={<OrderSuccess />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/new-arrivals" element={<NewArrivals />} />
                <Route path="/discount-items" element={<DiscountItems />} />
                <Route path="/flash-sale" element={<FlashSalePage />} />
                <Route path="/my-page" element={<MyPage />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/my-addresses" element={<MyAddresses />} />
                <Route path="/my-returns" element={<MyReturns />} />
                <Route path="/my-reviews" element={<MyReviews />} />
                <Route path="/my-settings" element={<MySettings />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/return-policy" element={<ReturnPolicy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/developer" element={<DeveloperPage />} />
                <Route path="/notifications" element={<Notifications />} />

                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="payment-methods" element={<AdminPaymentMethods />} />
                  <Route path="today-orders" element={<AdminTodayOrders />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="staff-performance" element={<AdminStaffPerformance />} />
                  <Route path="banners" element={<AdminBanners />} />
                  <Route path="promos" element={<AdminPromos />} />
                  <Route path="reviews" element={<AdminReviews />} />
                  <Route path="returns" element={<AdminReturns />} />
                  <Route path="claims-returns" element={<AdminClaimsReturns />} />
                  <Route path="contact-messages" element={<AdminContactMessages />} />
                  <Route path="chat" element={<AdminChat />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="product-analytics" element={<AdminProductAnalytics />} />
                  <Route path="ai-discounts" element={<AdminAiDiscounts />} />
                  <Route path="order-checklist" element={<AdminOrderChecklist />} />
                  <Route path="form-generator" element={<AdminFormGenerator />} />
                  <Route path="delivery" element={<AdminDelivery />} />
                  <Route path="stock-alerts" element={<AdminStockAlerts />} />
                  <Route path="city-manager" element={<AdminCityManager />} />
                  <Route path="ai-helper" element={<AdminAiHelper />} />
                  <Route path="ai-site-manager" element={<AdminAiSiteManager />} />
                  <Route path="ai-banner-creator" element={<AdminAiBannerCreator />} />
                  <Route path="ai-bulk-creator" element={<AdminAiBulkCreator />} />
                  <Route path="ai-fraud-detector" element={<AdminAiFraudDetector />} />
                  <Route path="ai-sales-predictor" element={<AdminAiSalesPredictor />} />
                  <Route path="ai-marketing-hub" element={<AdminAiMarketingHub />} />
                  <Route path="ai-feedback-analyzer" element={<AdminAiFeedbackAnalyzer />} />
                  <Route path="ai-price-intelligence" element={<AdminAiPriceIntelligence />} />
                  <Route path="ai-global-manager" element={<AdminAiGlobalManager />} />
                  <Route path="ai-voice" element={<AdminAiVoice />} />
                  <Route path="ai-claim-validator" element={<AdminClaimsReturns />} />
                  <Route path="ai-virtual-tryon" element={<AdminAiVirtualTryon />} />
                  <Route path="ai-size-advisor" element={<AdminAiSizeAdvisor />} />
                  <Route path="inventory" element={<AdminInventoryInsights />} />
                  <Route path="activity" element={<AdminActivity />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="trend-predictor" element={<AdminTrendPredictor />} />
                  <Route path="pricing-engine" element={<AdminPricingEngine />} />
                  <Route path="loyalty-heatmap" element={<AdminLoyaltyHeatmap />} />
                  <Route path="search-logs" element={<AdminSearchLogs />} />
                  <Route path="newsletter" element={<AdminNewsletter />} />
                  <Route path="finance-ledger" element={<AdminFinanceLedger />} />
                  <Route path="staff-salary" element={<AdminStaffSalary />} />
                  <Route path="tech-logs" element={<AdminTechLogs />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AIChatWidget />
            <AbandonedCartRecovery />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
