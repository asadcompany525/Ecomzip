// ============================================================
// App.tsx — Root component: providers, routing, lazy loading
// ============================================================

import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AIChatWidget from "@/components/chat/AIChatWidget";
import AbandonedCartRecovery from "@/components/AbandonedCartRecovery";
import AbandonedCartWebNotification from "@/components/AbandonedCartWebNotification";
import StopyLoader from "@/components/StopyLoader";
import RouteProgressBar from "@/components/ui/RouteProgressBar";
import { PageSkeleton, AdminPageSkeleton } from "@/components/ui/PageSkeleton";
import PageTransition from "@/components/PageTransition";

// ── Storefront Pages (lazy loaded) ──────────────────────────
const Index         = lazy(() => import("./pages/Index"));
const Products      = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart          = lazy(() => import("./pages/Cart"));
const Checkout      = lazy(() => import("./pages/Checkout"));
const OrderSuccess  = lazy(() => import("./pages/OrderSuccess"));
const Wishlist      = lazy(() => import("./pages/Wishlist"));
const Login         = lazy(() => import("./pages/Login"));
const Signup        = lazy(() => import("./pages/Signup"));
const NewArrivals   = lazy(() => import("./pages/NewArrivals"));
const DiscountItems = lazy(() => import("./pages/DiscountItems"));
const FlashSalePage = lazy(() => import("./pages/FlashSalePage"));
const MyPage        = lazy(() => import("./pages/MyPage"));
const MyOrders      = lazy(() => import("./pages/MyOrders"));
const MyAddresses   = lazy(() => import("./pages/MyAddresses"));
const MyReturns     = lazy(() => import("./pages/MyReturns"));
const MyReviews     = lazy(() => import("./pages/MyReviews"));
const MySettings    = lazy(() => import("./pages/MySettings"));
const TrackOrder    = lazy(() => import("./pages/TrackOrder"));
const ReturnPolicy  = lazy(() => import("./pages/ReturnPolicy"));
const Contact       = lazy(() => import("./pages/Contact"));
const FAQ           = lazy(() => import("./pages/FAQ"));
const NotFound      = lazy(() => import("./pages/NotFound"));
const DeveloperPage = lazy(() => import("./pages/DeveloperPage"));
const Notifications = lazy(() => import("./pages/Notifications"));

// ── Admin Panel Pages (lazy loaded) ─────────────────────────
const AdminLogin            = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout           = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard        = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts         = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories       = lazy(() => import("./pages/admin/AdminCategories"));
const AdminOrders           = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCustomers        = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminBanners          = lazy(() => import("./pages/admin/AdminBanners"));
const AdminPromos           = lazy(() => import("./pages/admin/AdminPromos"));
const AdminChat             = lazy(() => import("./pages/admin/AdminChat"));
const AdminReviews          = lazy(() => import("./pages/admin/AdminReviews"));
const AdminReports          = lazy(() => import("./pages/admin/AdminReports"));
const AdminStockAlerts      = lazy(() => import("./pages/admin/AdminStockAlerts"));
const AdminSettings         = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPayments         = lazy(() => import("./pages/admin/AdminPayments"));
const AdminTodayOrders      = lazy(() => import("./pages/admin/AdminTodayOrders"));
const AdminDelivery         = lazy(() => import("./pages/admin/AdminDelivery"));
const AdminActivity         = lazy(() => import("./pages/admin/AdminActivity"));
const AdminPaymentMethods   = lazy(() => import("./pages/admin/AdminPaymentMethods"));
const AdminAiDiscounts      = lazy(() => import("./pages/admin/AdminAiDiscounts"));
const AdminProductAnalytics = lazy(() => import("./pages/admin/AdminProductAnalytics"));
const AdminOrderChecklist   = lazy(() => import("./pages/admin/AdminOrderChecklist"));
const AdminFormGenerator    = lazy(() => import("./pages/admin/AdminFormGenerator"));
const AdminCityManager      = lazy(() => import("./pages/admin/AdminCityManager"));
const AdminAiHelper         = lazy(() => import("./pages/admin/AdminAiHelper"));
const AdminInventoryInsights= lazy(() => import("./pages/admin/AdminInventoryInsights"));
const AdminAiSiteManager    = lazy(() => import("./pages/admin/AdminAiSiteManager"));
const AdminAiBannerCreator  = lazy(() => import("./pages/admin/AdminAiBannerCreator"));
const AdminAiBulkCreator    = lazy(() => import("./pages/admin/AdminAiBulkCreator"));
const AdminAiGlobalManager  = lazy(() => import("./pages/admin/AdminAiGlobalManager"));
const AdminStaff            = lazy(() => import("./pages/admin/AdminStaff"));
const AdminStaffPerformance = lazy(() => import("./pages/admin/AdminStaffPerformance"));
const AdminAiFraudDetector  = lazy(() => import("./pages/admin/AdminAiFraudDetector"));
const AdminAiSalesPredictor = lazy(() => import("./pages/admin/AdminAiSalesPredictor"));
const AdminAiMarketingHub   = lazy(() => import("./pages/admin/AdminAiMarketingHub"));
const AdminAiFeedbackAnalyzer    = lazy(() => import("./pages/admin/AdminAiFeedbackAnalyzer"));
const AdminAiPriceIntelligence   = lazy(() => import("./pages/admin/AdminAiPriceIntelligence"));
const AdminTrendPredictor   = lazy(() => import("./pages/admin/AdminTrendPredictor"));
const AdminPricingEngine    = lazy(() => import("./pages/admin/AdminPricingEngine"));
const AdminLoyaltyHeatmap   = lazy(() => import("./pages/admin/AdminLoyaltyHeatmap"));
const AdminSearchLogs       = lazy(() => import("./pages/admin/AdminSearchLogs"));
const AdminNewsletter       = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminContactMessages  = lazy(() => import("./pages/admin/AdminContactMessages"));
const AdminClaimsReturns    = lazy(() => import("./pages/admin/AdminClaimsReturns"));
const AdminAiVirtualTryon   = lazy(() => import("./pages/admin/AdminAiVirtualTryon"));
const AdminAiVoice          = lazy(() => import("./pages/admin/AdminAiVoice"));
const AdminAiSizeAdvisor    = lazy(() => import("./pages/admin/AdminAiSizeAdvisor"));
const AdminFinanceLedger    = lazy(() => import("./pages/admin/AdminFinanceLedger"));
const AdminStaffSalary      = lazy(() => import("./pages/admin/AdminStaffSalary"));
const AdminTechLogs             = lazy(() => import("./pages/admin/AdminTechLogs"));
const AdminAiSalespersonChat    = lazy(() => import("./pages/admin/AdminAiSalespersonChat"));
const AdminStockNotifications   = lazy(() => import("./pages/admin/AdminStockNotifications"));

// ── React Query Config ───────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30 sec tak data fresh maana jata hai
      gcTime: 5 * 60_000,          // 5 min baad cache clear hota hai
      refetchOnWindowFocus: false, // Window focus pe auto-refetch band
    },
  },
});

// ── Site Branding Loader ─────────────────────────────────────
// DB se title aur favicon load karo aur browser tab update karo
const SiteBrandingLoader = () => {
  useEffect(() => {
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['site_branding', 'logo', 'site_title'])
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, any> = {};
        data.forEach(row => { map[row.key] = row.value; });

        // Browser tab title set karo
        const title = (typeof map.site_title === 'string' && map.site_title)
          || map.logo?.name
          || map.site_branding?.title;
        if (title) document.title = title;

        // Favicon set karo
        const favicon = map.logo?.url || map.site_branding?.favicon;
        if (favicon) {
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = favicon;
        }
      });
  }, []);
  return null; // Koi UI render nahi karta
};

// ── Admin Route Guard ────────────────────────────────────────
// Admin ya staff nahi hai to login page pe redirect karo
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isStaff, loading } = useAuth();
  if (loading) return <StopyLoader fullScreen />;
  if (!isAdmin && !isStaff) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

// ── Suspense Wrappers ────────────────────────────────────────
// S  = Storefront page skeleton fallback
// AS = Admin page skeleton fallback
// PT = Page transition + storefront skeleton
// PTL = Page transition + full-page loader (heavy pages ke liye)
const S   = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
);
const AS  = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<AdminPageSkeleton />}>{children}</Suspense>
);
const PT  = ({ children }: { children: React.ReactNode }) => (
  <PageTransition><Suspense fallback={<PageSkeleton />}>{children}</Suspense></PageTransition>
);
const PTL = ({ children }: { children: React.ReactNode }) => (
  <PageTransition><Suspense fallback={<StopyLoader fullScreen />}>{children}</Suspense></PageTransition>
);

// ── All Routes ───────────────────────────────────────────────
const AppRoutes = () => {
  const location = useLocation();
  return (
    <>
      <RouteProgressBar />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>

          {/* ── Storefront Routes ── */}
          <Route path="/"               element={<PTL><Index /></PTL>} />
          <Route path="/products"       element={<PT><Products /></PT>} />
          <Route path="/product/:id"    element={<PTL><ProductDetail /></PTL>} />
          <Route path="/cart"           element={<PT><Cart /></PT>} />
          <Route path="/checkout"       element={<PTL><Checkout /></PTL>} />
          <Route path="/order-success/:id" element={<PTL><OrderSuccess /></PTL>} />
          <Route path="/wishlist"       element={<PT><Wishlist /></PT>} />
          <Route path="/login"          element={<PT><Login /></PT>} />
          <Route path="/signup"         element={<PT><Signup /></PT>} />
          <Route path="/new-arrivals"   element={<PT><NewArrivals /></PT>} />
          <Route path="/discount-items" element={<PT><DiscountItems /></PT>} />
          <Route path="/flash-sale"     element={<PT><FlashSalePage /></PT>} />
          <Route path="/my-page"        element={<PT><MyPage /></PT>} />
          <Route path="/my-orders"      element={<PT><MyOrders /></PT>} />
          <Route path="/my-addresses"   element={<PT><MyAddresses /></PT>} />
          <Route path="/my-returns"     element={<PT><MyReturns /></PT>} />
          <Route path="/my-reviews"     element={<PT><MyReviews /></PT>} />
          <Route path="/my-settings"    element={<PT><MySettings /></PT>} />
          <Route path="/track-order"    element={<PT><TrackOrder /></PT>} />
          <Route path="/return-policy"  element={<PT><ReturnPolicy /></PT>} />
          <Route path="/contact"        element={<PT><Contact /></PT>} />
          <Route path="/faq"            element={<PT><FAQ /></PT>} />
          <Route path="/developer"      element={<PT><DeveloperPage /></PT>} />
          <Route path="/notifications"  element={<PT><Notifications /></PT>} />

          {/* ── Admin Panel Routes ── */}
          <Route path="/admin/login" element={<S><AdminLogin /></S>} />
          <Route path="/admin" element={
            <AdminGuard>
              <Suspense fallback={<StopyLoader fullScreen />}>
                <AdminLayout />
              </Suspense>
            </AdminGuard>
          }>
            <Route index                       element={<AS><AdminDashboard /></AS>} />
            <Route path="products"             element={<AS><AdminProducts /></AS>} />
            <Route path="categories"           element={<AS><AdminCategories /></AS>} />
            <Route path="orders"               element={<AS><AdminOrders /></AS>} />
            <Route path="payments"             element={<AS><AdminPayments /></AS>} />
            <Route path="payment-methods"      element={<AS><AdminPaymentMethods /></AS>} />
            <Route path="today-orders"         element={<AS><AdminTodayOrders /></AS>} />
            <Route path="customers"            element={<AS><AdminCustomers /></AS>} />
            <Route path="staff"                element={<AS><AdminStaff /></AS>} />
            <Route path="staff-performance"    element={<AS><AdminStaffPerformance /></AS>} />
            <Route path="banners"              element={<AS><AdminBanners /></AS>} />
            <Route path="promos"               element={<AS><AdminPromos /></AS>} />
            <Route path="reviews"              element={<AS><AdminReviews /></AS>} />
            <Route path="returns"              element={<AS><AdminClaimsReturns /></AS>} />
            <Route path="claims-returns"       element={<AS><AdminClaimsReturns /></AS>} />
            <Route path="contact-messages"     element={<AS><AdminContactMessages /></AS>} />
            <Route path="chat"                 element={<AS><AdminChat /></AS>} />
            <Route path="ai-salesperson-chat"  element={<AS><AdminAiSalespersonChat /></AS>} />
            <Route path="reports"              element={<AS><AdminReports /></AS>} />
            <Route path="product-analytics"    element={<AS><AdminProductAnalytics /></AS>} />
            <Route path="ai-discounts"         element={<AS><AdminAiDiscounts /></AS>} />
            <Route path="order-checklist"      element={<AS><AdminOrderChecklist /></AS>} />
            <Route path="form-generator"       element={<AS><AdminFormGenerator /></AS>} />
            <Route path="delivery"             element={<AS><AdminDelivery /></AS>} />
            <Route path="stock-alerts"         element={<AS><AdminStockAlerts /></AS>} />
            <Route path="stock-notifications"  element={<AS><AdminStockNotifications /></AS>} />
            <Route path="city-manager"         element={<AS><AdminCityManager /></AS>} />
            <Route path="ai-helper"            element={<AS><AdminAiHelper /></AS>} />
            <Route path="ai-site-manager"      element={<AS><AdminAiSiteManager /></AS>} />
            <Route path="ai-banner-creator"    element={<AS><AdminAiBannerCreator /></AS>} />
            <Route path="ai-bulk-creator"      element={<AS><AdminAiBulkCreator /></AS>} />
            <Route path="ai-fraud-detector"    element={<AS><AdminAiFraudDetector /></AS>} />
            <Route path="ai-sales-predictor"   element={<AS><AdminAiSalesPredictor /></AS>} />
            <Route path="ai-marketing-hub"     element={<AS><AdminAiMarketingHub /></AS>} />
            <Route path="ai-feedback-analyzer" element={<AS><AdminAiFeedbackAnalyzer /></AS>} />
            <Route path="ai-price-intelligence"element={<AS><AdminAiPriceIntelligence /></AS>} />
            <Route path="ai-global-manager"    element={<AS><AdminAiGlobalManager /></AS>} />
            <Route path="ai-voice"             element={<AS><AdminAiVoice /></AS>} />
            <Route path="ai-claim-validator"   element={<AS><AdminClaimsReturns /></AS>} />
            <Route path="ai-virtual-tryon"     element={<AS><AdminAiVirtualTryon /></AS>} />
            <Route path="ai-size-advisor"      element={<AS><AdminAiSizeAdvisor /></AS>} />
            <Route path="inventory"            element={<AS><AdminInventoryInsights /></AS>} />
            <Route path="activity"             element={<AS><AdminActivity /></AS>} />
            <Route path="settings"             element={<AS><AdminSettings /></AS>} />
            <Route path="trend-predictor"      element={<AS><AdminTrendPredictor /></AS>} />
            <Route path="pricing-engine"       element={<AS><AdminPricingEngine /></AS>} />
            <Route path="loyalty-heatmap"      element={<AS><AdminLoyaltyHeatmap /></AS>} />
            <Route path="search-logs"          element={<AS><AdminSearchLogs /></AS>} />
            <Route path="newsletter"           element={<AS><AdminNewsletter /></AS>} />
            <Route path="finance-ledger"       element={<AS><AdminFinanceLedger /></AS>} />
            <Route path="staff-salary"         element={<AS><AdminStaffSalary /></AS>} />
            <Route path="tech-logs"            element={<AS><AdminTechLogs /></AS>} />
          </Route>

          {/* 404 — Koi route match nahi hua */}
          <Route path="*" element={<PT><NotFound /></PT>} />

        </Routes>
      </AnimatePresence>

      {/* ── Global Components (har page pe) ── */}
      <AIChatWidget />               {/* Floating AI chat button */}
      <AbandonedCartRecovery />      {/* 30+ min idle cart detect karta hai */}
      <AbandonedCartWebNotification />{/* Browser notification for abandoned cart */}
    </>
  );
};

// ── Root App Component ───────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />        {/* shadcn toast notifications */}
          <Sonner />         {/* Sonner toast notifications */}
          <SiteBrandingLoader />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
