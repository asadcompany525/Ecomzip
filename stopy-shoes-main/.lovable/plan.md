

# 🛒 AI-Powered E-Commerce Platform (Daraz/Stylo Style)

## Phase 1: Foundation — Home Page + Product Catalog
- **Dynamic Home Page** with hero banners, flash sale section, trending products, discounted items, and category grid
- **Product Listing Page** with smart filters (price range, color, size, brand, gender, type)
- **Product Detail Page** with image gallery, size/color selector, reviews section, and related products
- **Search Bar** with auto-suggestions
- **Responsive Design** — mobile-first, works perfectly on all devices
- **Urdu/English language toggle** with PKR currency
- **Header & Footer** with navigation, categories menu, and quick links

## Phase 2: Auth + User Panel
- **Email/Password Registration & Login** with Supabase Auth
- **User Profile** with name, avatar, addresses, and order history
- **Multiple Address Management** with default address selection
- **Wishlist** — save products for later
- **Shopping Cart** with quantity control, size/color selection

## Phase 3: Checkout + Orders
- **Checkout Flow** — address selection, order summary, promo code input
- **Payment Options** — COD (Cash on Delivery) + Stripe for online payments
- **Order Confirmation** with order number and summary
- **Order History** — view all past orders with status tracking
- **Order Status Tracking** — Pending → Confirmed → Shipped → Delivered → Received

## Phase 4: Admin Panel — Product & Order Management
- **Admin Dashboard** with sales overview, recent orders, revenue charts
- **Product Management** — Add/Edit/Delete products with multiple images, sizes, colors, brand, discount, flash sale toggle
- **Category Management** — Create/edit categories and sub-categories
- **Order Management** — View all orders, update status, print invoice
- **Inventory Tracking** — Real-time stock levels, low stock alerts
- **Barcode/QR Code Generation** for orders

## Phase 5: AI Features
- **AI Chatbot** (Lovable AI) — answer product questions, order status inquiries, return/claim help with admin manual takeover option
- **AI Product Recommendations** on home page and product pages based on browsing history
- **AI Smart Search** — natural language product search
- **AI Admin Assistant** — suggest restocking, identify dead stock, sales predictions, order delay alerts
- **AI Auto-Category Detection** — upload product image and AI suggests category, sub-category, type, and price

## Phase 6: Return/Claim System + Advanced Features
- **Return Request System** — user submits return with reason and photos
- **Claim/Refund Management** — AI checks return policy validity, time limits, suggests approve/reject
- **Refund Tracking** for users
- **Banner Ad Management** (manual + auto rotation)
- **Promo Code System** — create, manage, and apply discount codes
- **Daily/Weekly/Monthly Sales Reports** with charts

## Design Style
- Clean, modern UI inspired by Daraz.pk and Stylo.pk
- Orange/blue accent colors with white background
- Card-based product layout with hover effects
- Sticky header with search bar and cart icon
- Bottom navigation on mobile
- Smooth animations and transitions

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — Database, Auth, Storage, Edge Functions
- **AI**: Lovable AI Gateway (Gemini) for chatbot, recommendations, and image detection
- **Payments**: Stripe integration + COD
- **Storage**: Supabase Storage for product images

