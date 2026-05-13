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
import RouteProgressBar from "@/components/ui/RouteProgressBar";
import { PageSkeleton, AdminPageSkeleton } from "@/components/ui/PageSkeleton";

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
const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
);
const AS = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<AdminPageSkeleton />}>{children}</Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <SiteBrandingLoader />
          <BrowserRouter>
            <RouteProgressBar />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Suspense fallback={<PageLoader />}><Index /></Suspense>} />
                <Route path="/products" element={<S><Products /></S>} />
                <Route path="/product/:id" element={<Suspense fallback={<PageLoader />}><ProductDetail /></Suspense>} />
                <Route path="/cart" element={<S><Cart /></S>} />
                <Route path="/checkout" element={<Suspense fallback={<PageLoader />}><Checkout /></Suspense>} />
                <Route path="/order-success/:id" element={<Suspense fallback={<PageLoader />}><OrderSuccess /></Suspense>} />
                <Route path="/wishlist" element={<S><Wishlist /></S>} />
                <Route path="/login" element={<S><Login /></S>} />
                <Route path="/signup" element={<S><Signup /></S>} />
                <Route path="/new-arrivals" element={<S><NewArrivals /></S>} />
                <Route path="/discount-items" element={<S><DiscountItems /></S>} />
                <Route path="/flash-sale" element={<S><FlashSalePage /></S>} />
                <Route path="/my-page" element={<S><MyPage /></S>} />
                <Route path="/my-orders" element={<S><MyOrders /></S>} />
                <Route path="/my-addresses" element={<S><MyAddresses /></S>} />
                <Route path="/my-returns" element={<S><MyReturns /></S>} />
                <Route path="/my-reviews" element={<S><MyReviews /></S>} />
                <Route path="/my-settings" element={<S><MySettings /></S>} />
                <Route path="/track-order" element={<S><TrackOrder /></S>} />
                <Route path="/return-policy" element={<S><ReturnPolicy /></S>} />
                <Route path="/contact" element={<S><Contact /></S>} />
                <Route path="/faq" element={<S><FAQ /></S>} />
                <Route path="/developer" element={<S><DeveloperPage /></S>} />
                <Route path="/notifications" element={<S><Notifications /></S>} />

                <Route path="/admin/login" element={<S><AdminLogin /></S>} />
                <Route path="/admin" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminLayout /></Suspense></AdminGuard>}>
                  <Route index element={<AS><AdminDashboard /></AS>} />
                  <Route path="products" element={<AS><AdminProducts /></AS>} />
                  <Route path="categories" element={<AS><AdminCategories /></AS>} />
                  <Route path="orders" element={<AS><AdminOrders /></AS>} />
                  <Route path="payments" element={<AS><AdminPayments /></AS>} />
                  <Route path="payment-methods" element={<AS><AdminPaymentMethods /></AS>} />
                  <Route path="today-orders" element={<AS><AdminTodayOrders /></AS>} />
                  <Route path="customers" element={<AS><AdminCustomers /></AS>} />
                  <Route path="staff" element={<AS><AdminStaff /></AS>} />
                  <Route path="staff-performance" element={<AS><AdminStaffPerformance /></AS>} />
                  <Route path="banners" element={<AS><AdminBanners /></AS>} />
                  <Route path="promos" element={<AS><AdminPromos /></AS>} />
                  <Route path="reviews" element={<AS><AdminReviews /></AS>} />
                  <Route path="returns" element={<AS><AdminClaimsReturns /></AS>} />
                  <Route path="claims-returns" element={<AS><AdminClaimsReturns /></AS>} />
                  <Route path="contact-messages" element={<AS><AdminContactMessages /></AS>} />
                  <Route path="chat" element={<AS><AdminChat /></AS>} />
                  <Route path="reports" element={<AS><AdminReports /></AS>} />
                  <Route path="product-analytics" element={<AS><AdminProductAnalytics /></AS>} />
                  <Route path="ai-discounts" element={<AS><AdminAiDiscounts /></AS>} />
                  <Route path="order-checklist" element={<AS><AdminOrderChecklist /></AS>} />
                  <Route path="form-generator" element={<AS><AdminFormGenerator /></AS>} />
                  <Route path="delivery" element={<AS><AdminDelivery /></AS>} />
                  <Route path="stock-alerts" element={<AS><AdminStockAlerts /></AS>} />
                  <Route path="city-manager" element={<AS><AdminCityManager /></AS>} />
                  <Route path="ai-helper" element={<AS><AdminAiHelper /></AS>} />
                  <Route path="ai-site-manager" element={<AS><AdminAiSiteManager /></AS>} />
                  <Route path="ai-banner-creator" element={<AS><AdminAiBannerCreator /></AS>} />
                  <Route path="ai-bulk-creator" element={<AS><AdminAiBulkCreator /></AS>} />
                  <Route path="ai-fraud-detector" element={<AS><AdminAiFraudDetector /></AS>} />
                  <Route path="ai-sales-predictor" element={<AS><AdminAiSalesPredictor /></AS>} />
                  <Route path="ai-marketing-hub" element={<AS><AdminAiMarketingHub /></AS>} />
                  <Route path="ai-feedback-analyzer" element={<AS><AdminAiFeedbackAnalyzer /></AS>} />
                  <Route path="ai-price-intelligence" element={<AS><AdminAiPriceIntelligence /></AS>} />
                  <Route path="ai-global-manager" element={<AS><AdminAiGlobalManager /></AS>} />
                  <Route path="ai-voice" element={<AS><AdminAiVoice /></AS>} />
                  <Route path="ai-claim-validator" element={<AS><AdminClaimsReturns /></AS>} />
                  <Route path="ai-virtual-tryon" element={<AS><AdminAiVirtualTryon /></AS>} />
                  <Route path="ai-size-advisor" element={<AS><AdminAiSizeAdvisor /></AS>} />
                  <Route path="inventory" element={<AS><AdminInventoryInsights /></AS>} />
                  <Route path="activity" element={<AS><AdminActivity /></AS>} />
                  <Route path="settings" element={<AS><AdminSettings /></AS>} />
                  <Route path="trend-predictor" element={<AS><AdminTrendPredictor /></AS>} />
                  <Route path="pricing-engine" element={<AS><AdminPricingEngine /></AS>} />
                  <Route path="loyalty-heatmap" element={<AS><AdminLoyaltyHeatmap /></AS>} />
                  <Route path="search-logs" element={<AS><AdminSearchLogs /></AS>} />
                  <Route path="newsletter" element={<AS><AdminNewsletter /></AS>} />
                  <Route path="finance-ledger" element={<AS><AdminFinanceLedger /></AS>} />
                  <Route path="staff-salary" element={<AS><AdminStaffSalary /></AS>} />
                  <Route path="tech-logs" element={<AS><AdminTechLogs /></AS>} />
                </Route>

                <Route path="*" element={<S><NotFound /></S>} />
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
