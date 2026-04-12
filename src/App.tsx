import { useEffect } from "react";
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
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Wishlist from "./pages/Wishlist";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NewArrivals from "./pages/NewArrivals";
import DiscountItems from "./pages/DiscountItems";
import FlashSalePage from "./pages/FlashSalePage";
import MyPage from "./pages/MyPage";
import MyOrders from "./pages/MyOrders";
import MyAddresses from "./pages/MyAddresses";
import MyReturns from "./pages/MyReturns";
import MyReviews from "./pages/MyReviews";
import MySettings from "./pages/MySettings";
import TrackOrder from "./pages/TrackOrder";
import ReturnPolicy from "./pages/ReturnPolicy";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import DeveloperPage from "./pages/DeveloperPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminPromos from "./pages/admin/AdminPromos";
import AdminReturns from "./pages/admin/AdminReturns";
import AdminChat from "./pages/admin/AdminChat";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminReports from "./pages/admin/AdminReports";
import AdminStockAlerts from "./pages/admin/AdminStockAlerts";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminTodayOrders from "./pages/admin/AdminTodayOrders";
import AdminDelivery from "./pages/admin/AdminDelivery";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods";
import AdminAiDiscounts from "./pages/admin/AdminAiDiscounts";
import AdminProductAnalytics from "./pages/admin/AdminProductAnalytics";
import AdminOrderChecklist from "./pages/admin/AdminOrderChecklist";
import AdminFormGenerator from "./pages/admin/AdminFormGenerator";
import AdminCityManager from "./pages/admin/AdminCityManager";
import AdminAiHelper from "./pages/admin/AdminAiHelper";
import AdminInventoryInsights from "./pages/admin/AdminInventoryInsights";
import AdminAiSiteManager from "./pages/admin/AdminAiSiteManager";
import AdminAiBannerCreator from "./pages/admin/AdminAiBannerCreator";
import AdminAiBulkCreator from "./pages/admin/AdminAiBulkCreator";
import AdminAiGlobalManager from "./pages/admin/AdminAiGlobalManager";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminStaffPerformance from "./pages/admin/AdminStaffPerformance";
import AdminAiFraudDetector from "./pages/admin/AdminAiFraudDetector";
import AdminAiSalesPredictor from "./pages/admin/AdminAiSalesPredictor";
import AdminAiMarketingHub from "./pages/admin/AdminAiMarketingHub";
import AdminAiFeedbackAnalyzer from "./pages/admin/AdminAiFeedbackAnalyzer";
import AdminAiPriceIntelligence from "./pages/admin/AdminAiPriceIntelligence";
import AdminTrendPredictor from "./pages/admin/AdminTrendPredictor";
import AdminPricingEngine from "./pages/admin/AdminPricingEngine";
import AdminLoyaltyHeatmap from "./pages/admin/AdminLoyaltyHeatmap";
import AdminSearchLogs from "./pages/admin/AdminSearchLogs";
import AdminNewsletter from "./pages/admin/AdminNewsletter";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const SiteBrandingLoader = () => {
  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['site_branding', 'logo', 'site_title']).then(({ data }) => {
      if (!data) return;
      const map: Record<string, any> = {};
      data.forEach(row => { map[row.key] = row.value; });

      // Determine title: site_title > logo.name > site_branding.title
      const title = (typeof map.site_title === 'string' && map.site_title)
        || (map.logo?.name)
        || (map.site_branding?.title);
      if (title) document.title = title;

      // Determine favicon: logo.url > site_branding.favicon
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <SiteBrandingLoader />
          <BrowserRouter>
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
                <Route path="ai-voice" element={<AdminAiGlobalManager />} />
                <Route path="inventory" element={<AdminInventoryInsights />} />
                <Route path="activity" element={<AdminActivity />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="trend-predictor" element={<AdminTrendPredictor />} />
                <Route path="pricing-engine" element={<AdminPricingEngine />} />
                <Route path="loyalty-heatmap" element={<AdminLoyaltyHeatmap />} />
                <Route path="search-logs" element={<AdminSearchLogs />} />
                <Route path="newsletter" element={<AdminNewsletter />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIChatWidget />
            <AbandonedCartRecovery />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
