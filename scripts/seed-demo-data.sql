-- ============================================================
-- Stopy Shoes — Demo Data Seeder
-- Run in Supabase Dashboard → SQL Editor to populate test data
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING / DO UPDATE)
-- ============================================================

-- ─── 1. CATEGORIES ──────────────────────────────────────────
INSERT INTO categories (id, name, level, is_active, sort_order)
VALUES
  ('cat-sneakers', 'Sneakers', 1, true, 1),
  ('cat-formal',   'Formal',   1, true, 2),
  ('cat-sandals',  'Sandals',  1, true, 3),
  ('cat-boots',    'Boots',    1, true, 4),
  ('cat-bags',     'Bags',     1, true, 5),
  ('cat-kids',     'Kids',     1, true, 6),
  ('cat-sports',   'Sports',   1, true, 7),
  ('cat-heels',    'Heels',    1, true, 8)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. BANNERS ─────────────────────────────────────────────
INSERT INTO banners (id, title, subtitle, image_url, bg_color, link, is_active, sort_order)
VALUES
  ('banner-1', 'Fresh Finds Just Arrived!',   'Discover our latest sneaker collection', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80', '#1a1a2e', '/new-arrivals', true, 1),
  ('banner-2', '⚡ Flash Sale — Up to 50% Off', 'Limited time deals on premium shoes',   'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1200&q=80', '#16213e', '/flash-sale',   true, 2),
  ('banner-3', 'Premium Bags Collection',      'Luxury bags at unbeatable prices',       'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', '#0f3460', '/products',      true, 3)
ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

-- ─── 3. PRODUCTS ─────────────────────────────────────────────
INSERT INTO products (id, title, brand, price, original_price, discount_percent, stock, sold, images, colors, sizes, description, is_active, is_featured, is_flash_sale, category_id, tags, rating, review_count, gender)
VALUES
  (
    'prod-001', 'Nike Air Max 270', 'Nike', 8500, 12000, 29, 45, 312,
    ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80','https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80'],
    ARRAY['Red/Black','White','Grey'], ARRAY['38','39','40','41','42','43','44'],
    'The Nike Air Max 270 delivers a bold look and incredible cushioning with its large Air unit for all-day comfort.',
    true, true, false, 'cat-sneakers', ARRAY['NKA270','nike','sneakers'], 4.5, 89, 'unisex'
  ),
  (
    'prod-002', 'Adidas Ultraboost 23', 'Adidas', 11500, 15000, 23, 30, 198,
    ARRAY['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80','https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80'],
    ARRAY['White/Silver','Black/Orange'], ARRAY['39','40','41','42','43','44'],
    'Experience incredible energy return with Adidas Ultraboost. The Primeknit upper wraps your foot like a second skin.',
    true, true, true, 'cat-sneakers', ARRAY['ADB23','adidas','running'], 4.7, 134, 'unisex'
  ),
  (
    'prod-003', 'Classic Leather Oxford', 'Stopy', 4200, null, 0, 60, 87,
    ARRAY['https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80','https://images.unsplash.com/photo-1613987245117-e3d7a05ef5c4?w=600&q=80'],
    ARRAY['Brown','Black','Tan'], ARRAY['40','41','42','43','44','45'],
    'Timeless leather oxford shoes handcrafted from genuine leather. Perfect for formal occasions and business meetings.',
    true, false, false, 'cat-formal', ARRAY['OXFRD','leather','formal'], 4.3, 45, 'men'
  ),
  (
    'prod-004', 'Summer Flat Sandals', 'Comfort Zone', 1800, 2500, 28, 120, 654,
    ARRAY['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80'],
    ARRAY['Beige','White','Brown'], ARRAY['36','37','38','39','40','41'],
    'Lightweight and stylish summer sandals perfect for beach days or casual outings. Non-slip sole for safety.',
    true, true, true, 'cat-sandals', ARRAY['SFSAN','sandals','summer'], 4.1, 203, 'women'
  ),
  (
    'prod-005', 'Chelsea Ankle Boots', 'Urban Walk', 6800, 9000, 24, 25, 156,
    ARRAY['https://images.unsplash.com/photo-1608256246200-e3c00a8c0884?w=600&q=80'],
    ARRAY['Black','Brown','Caramel'], ARRAY['36','37','38','39','40','41'],
    'Sleek Chelsea ankle boots with elastic side panels. Genuine suede upper with rubber sole for durability.',
    true, true, false, 'cat-boots', ARRAY['CHBOT','boots','ankle'], 4.4, 78, 'women'
  ),
  (
    'prod-006', 'Puma RS-X Retro', 'Puma', 7200, 9500, 24, 38, 275,
    ARRAY['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80'],
    ARRAY['White/Blue','Black/Yellow','Red/White'], ARRAY['38','39','40','41','42','43'],
    'Bold retro-inspired design meets modern performance in the Puma RS-X. Thick sole with RS cushioning technology.',
    true, true, true, 'cat-sneakers', ARRAY['PMRSX','puma','retro'], 4.2, 112, 'unisex'
  ),
  (
    'prod-007', 'Leather Tote Bag', 'LuxBag', 5500, 7000, 21, 55, 189,
    ARRAY['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80','https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80'],
    ARRAY['Black','Tan','Navy'], ARRAY['One Size'],
    'Premium genuine leather tote bag with inner pockets and zip closure. Fits A4 documents, laptop, and daily essentials.',
    true, true, false, 'cat-bags', ARRAY['LTOTE','bag','leather'], 4.6, 67, 'women'
  ),
  (
    'prod-008', 'Kids Rainbow Sneakers', 'KidStep', 2200, 3000, 27, 80, 423,
    ARRAY['https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=600&q=80'],
    ARRAY['Rainbow','Pink/White','Blue/White'], ARRAY['28','29','30','31','32','33','34','35'],
    'Fun and durable kids sneakers with Velcro straps for easy wear. Breathable mesh upper keeps little feet cool.',
    true, false, false, 'cat-kids', ARRAY['KRSNK','kids','sneakers'], 4.8, 315, 'unisex'
  ),
  (
    'prod-009', 'Jordan 1 High OG', 'Jordan', 18500, 22000, 16, 12, 98,
    ARRAY['https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=600&q=80'],
    ARRAY['Chicago Red','Royal Blue','Bred'], ARRAY['40','41','42','43','44'],
    'The iconic Air Jordan 1 High OG. Premium leather upper with visible Air cushioning. A streetwear staple.',
    true, true, false, 'cat-sneakers', ARRAY['JD1HI','jordan','basketball'], 4.9, 56, 'unisex'
  ),
  (
    'prod-010', 'New Balance 574 Classic', 'New Balance', 6900, 8500, 19, 42, 234,
    ARRAY['https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80'],
    ARRAY['Navy/White','Grey/Burgundy','Green/Grey'], ARRAY['38','39','40','41','42','43'],
    'The New Balance 574 is a timeless classic. ENCAP midsole technology for superior support and durability.',
    true, false, false, 'cat-sneakers', ARRAY['NB574','newbalance','classic'], 4.4, 89, 'unisex'
  ),
  (
    'prod-011', 'Ladies Stiletto Heels', 'Glamour', 3500, 5000, 30, 35, 167,
    ARRAY['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80'],
    ARRAY['Red','Black','Nude','Silver'], ARRAY['36','37','38','39','40','41'],
    'Elegant stiletto heels for formal events and parties. 4-inch heel with cushioned insole for all-evening comfort.',
    true, false, true, 'cat-heels', ARRAY['LSTHL','heels','formal'], 4.0, 92, 'women'
  ),
  (
    'prod-012', 'Crossbody Mini Bag', 'StyleCo', 2800, 3500, 20, 90, 312,
    ARRAY['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80'],
    ARRAY['Pink','Black','White','Olive'], ARRAY['One Size'],
    'Cute and compact crossbody bag with adjustable strap. Gold hardware with multiple card slots and a zip compartment.',
    true, true, false, 'cat-bags', ARRAY['CRMNI','bag','crossbody'], 4.5, 145, 'women'
  ),
  (
    'prod-013', 'Nike React Infinity', 'Nike', 9800, 13000, 25, 28, 143,
    ARRAY['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80'],
    ARRAY['Phantom/Orange','Black/White','Blue/Pink'], ARRAY['38','39','40','41','42','43','44'],
    'Designed to help reduce injury and keep you on the run. React foam with wide base for smooth transitions.',
    true, true, false, 'cat-sports', ARRAY['NKRI','nike','running'], 4.6, 71, 'unisex'
  ),
  (
    'prod-014', 'Slip-On Loafers', 'EasyWalk', 2400, 3200, 25, 75, 289,
    ARRAY['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80'],
    ARRAY['Black','Navy','Brown'], ARRAY['39','40','41','42','43','44','45'],
    'Classic slip-on penny loafers in smooth leather. Versatile style that works with both casual and semi-formal outfits.',
    true, false, false, 'cat-formal', ARRAY['SLPLF','loafer','casual'], 4.2, 118, 'men'
  ),
  (
    'prod-015', 'Backpack Pro Series', 'TravelMax', 4800, 6500, 26, 65, 201,
    ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80'],
    ARRAY['Black','Grey','Navy'], ARRAY['One Size'],
    '30L capacity backpack with laptop compartment, USB charging port, and anti-theft hidden pocket. Water resistant.',
    true, false, false, 'cat-bags', ARRAY['BKPRO','backpack','travel'], 4.7, 88, 'unisex'
  ),
  (
    'prod-016', 'Sports Trail Runners', 'TrailX', 5500, 7200, 24, 32, 167,
    ARRAY['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80'],
    ARRAY['Orange/Black','Blue/Green','Grey/Yellow'], ARRAY['39','40','41','42','43','44'],
    'High-performance trail running shoes with aggressive grip, waterproof upper, and Ortholite insole.',
    true, true, false, 'cat-sports', ARRAY['TRLRN','running','trail'], 4.5, 93, 'unisex'
  ),
  (
    'prod-017', 'Embroidered Khussa', 'Desi Craft', 1200, 1800, 33, 150, 567,
    ARRAY['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80'],
    ARRAY['Red/Gold','Blue/Silver','Green/Gold'], ARRAY['36','37','38','39','40','41','42'],
    'Traditional hand-embroidered khussa shoes made by skilled artisans. Perfect for weddings and cultural events.',
    true, true, true, 'cat-sandals', ARRAY['EMBKH','khussa','ethnic'], 4.6, 234, 'women'
  ),
  (
    'prod-018', 'Reebok Club C 85', 'Reebok', 5800, 7500, 23, 48, 178,
    ARRAY['https://images.unsplash.com/photo-1570464197285-9949814674a7?w=600&q=80'],
    ARRAY['White/Green','White/Red','All White'], ARRAY['38','39','40','41','42','43'],
    'The Reebok Club C 85 — a timeless tennis classic. Low-cut silhouette with leather upper and die-cut EVA midsole.',
    true, false, false, 'cat-sneakers', ARRAY['RBC85','reebok','tennis'], 4.3, 67, 'unisex'
  ),
  (
    'prod-019', 'Platform Wedge Sandals', 'Vogue Step', 2900, 4000, 28, 62, 198,
    ARRAY['https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600&q=80'],
    ARRAY['Beige','Black','White'], ARRAY['36','37','38','39','40','41'],
    'Trendy platform wedge sandals with ankle strap. 3-inch wedge provides height with comfort. Suede upper.',
    true, true, false, 'cat-heels', ARRAY['PLWDG','wedge','sandals'], 4.1, 87, 'women'
  ),
  (
    'prod-020', 'Men Formal Brogues', 'Gentlemen', 7500, 10000, 25, 22, 134,
    ARRAY['https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&q=80'],
    ARRAY['Dark Brown','Black','Tan'], ARRAY['40','41','42','43','44','45'],
    'Classic Oxford brogues with medallion toe cap. Hand-stitched Goodyear welt construction. Leather sole.',
    true, true, false, 'cat-formal', ARRAY['MFBRG','brogue','formal'], 4.8, 45, 'men'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, price = EXCLUDED.price, stock = EXCLUDED.stock,
  is_active = EXCLUDED.is_active, images = EXCLUDED.images;

-- ─── 4. REVIEWS ──────────────────────────────────────────────
INSERT INTO reviews (id, product_id, customer_name, rating, comment, is_approved, created_at)
VALUES
  ('rev-001', 'prod-001', 'Ahmed Khan',    5, 'Amazing comfort! Wore them all day at work. Worth every rupee.', true, NOW() - INTERVAL '2 days'),
  ('rev-002', 'prod-001', 'Sara Malik',    4, 'Great shoes, runs slightly large so size down. Love the color!', true, NOW() - INTERVAL '5 days'),
  ('rev-003', 'prod-001', 'Usman Ali',     5, 'Best Nike I ever owned. Super responsive cushioning.',           true, NOW() - INTERVAL '8 days'),
  ('rev-004', 'prod-002', 'Fatima Noor',   5, 'Ultraboost is game changing. Running feels effortless now.',    true, NOW() - INTERVAL '1 day'),
  ('rev-005', 'prod-002', 'Bilal Hassan',  4, 'Premium quality. Slightly pricey but worth it for runners.',    true, NOW() - INTERVAL '3 days'),
  ('rev-006', 'prod-003', 'Kamran Javed',  4, 'Solid formal shoes. Comfortable from day one, no break-in.',   true, NOW() - INTERVAL '6 days'),
  ('rev-007', 'prod-004', 'Ayesha Raza',   5, 'Perfect summer sandals! Wore them to the beach. No blisters.', true, NOW() - INTERVAL '4 days'),
  ('rev-008', 'prod-004', 'Sana Bukhari',  4, 'Nice and comfortable. Came in 2 days. Will buy more colors.',  true, NOW() - INTERVAL '9 days'),
  ('rev-009', 'prod-005', 'Hina Shah',     5, 'Love these boots! Goes with everything in my wardrobe.',       true, NOW() - INTERVAL '7 days'),
  ('rev-010', 'prod-006', 'Zara Ahmed',    4, 'Puma quality never disappoints. Very stylish retro look.',      true, NOW() - INTERVAL '2 days'),
  ('rev-011', 'prod-007', 'Mahnoor Iqbal', 5, 'Gorgeous tote! Fits my laptop + groceries. Very sturdy.',       true, NOW() - INTERVAL '3 days'),
  ('rev-012', 'prod-009', 'Hassan Raza',   5, 'Jordan 1s are iconic. The quality is legit. Fast delivery!',   true, NOW() - INTERVAL '1 day'),
  ('rev-013', 'prod-009', 'Ali Nawaz',     5, 'Best sneakers in my collection. Stopy delivered quickly!',     true, NOW() - INTERVAL '10 days'),
  ('rev-014', 'prod-012', 'Nadia Farooq',  5, 'So cute! Many compliments on this bag. Packaging was great.',  true, NOW() - INTERVAL '5 days'),
  ('rev-015', 'prod-013', 'Tariq Mehmood', 4, 'React foam is incredibly comfortable. My go-to running shoe.', true, NOW() - INTERVAL '4 days'),
  ('rev-016', 'prod-017', 'Rubina Khatoon',5, 'Perfect for my cousin''s wedding. Very authentic embroidery!', true, NOW() - INTERVAL '6 days'),
  ('rev-017', 'prod-020', 'Asad Mir',      5, 'Professional and elegant. My boss noticed them on day 1!',     true, NOW() - INTERVAL '8 days'),
  ('rev-018', 'prod-015', 'Waqas Siddiqui',5, 'Best backpack for uni. USB port is a lifesaver. Very roomy!',  true, NOW() - INTERVAL '3 days'),
  ('rev-019', 'prod-001', 'Imran Baig',    3, 'Good shoe but expected better sole grip on wet surfaces.',      false, NOW() - INTERVAL '1 day'),
  ('rev-020', 'prod-008', 'Rizwana Bano',  5, 'My kids love these! Velcro is easy for them. Bright colors!',  true, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Update review counts and ratings on products
UPDATE products SET
  review_count = sub.cnt,
  rating = sub.avg_rating
FROM (
  SELECT product_id, COUNT(*) AS cnt, ROUND(AVG(rating)::numeric, 1) AS avg_rating
  FROM reviews WHERE is_approved = true
  GROUP BY product_id
) sub
WHERE products.id = sub.product_id;

-- ─── 5. DEMO ORDERS ──────────────────────────────────────────
-- Note: customer_id is optional — leaving null for demo
INSERT INTO orders (id, order_number, status, payment_method, payment_status, total, delivery_address, created_at)
VALUES
  ('ord-001', 'STPY-1001', 'delivered',   'cod',        'paid',    8500,  '{"name":"Ahmed Khan","phone":"03001234567","address":"House 12, Street 5, G-9 Islamabad","city":"Islamabad","province":"ICT"}', NOW() - INTERVAL '15 days'),
  ('ord-002', 'STPY-1002', 'delivered',   'easypaisa',  'paid',    11500, '{"name":"Sara Malik","phone":"03211234567","address":"Flat 4B, Block C, DHA Phase 6 Lahore","city":"Lahore","province":"Punjab"}', NOW() - INTERVAL '12 days'),
  ('ord-003', 'STPY-1003', 'shipped',     'cod',        'pending', 6300,  '{"name":"Usman Ali","phone":"03331234567","address":"Shop 7, Saddar Karachi","city":"Karachi","province":"Sindh"}',  NOW() - INTERVAL '8 days'),
  ('ord-004', 'STPY-1004', 'processing',  'jazzcash',   'paid',    19500, '{"name":"Fatima Noor","phone":"03451234567","address":"House 3, Model Town Lahore","city":"Lahore","province":"Punjab"}', NOW() - INTERVAL '5 days'),
  ('ord-005', 'STPY-1005', 'pending',     'cod',        'pending', 5500,  '{"name":"Bilal Hassan","phone":"03111234567","address":"Street 9, F-7/1 Islamabad","city":"Islamabad","province":"ICT"}', NOW() - INTERVAL '3 days'),
  ('ord-006', 'STPY-1006', 'confirmed',   'cod',        'pending', 4000,  '{"name":"Ayesha Raza","phone":"03051234567","address":"House 45, Johar Town Lahore","city":"Lahore","province":"Punjab"}', NOW() - INTERVAL '2 days'),
  ('ord-007', 'STPY-1007', 'pending',     'easypaisa',  'paid',    7200,  '{"name":"Kamran Javed","phone":"03221234567","address":"Block 5, Gulshan-e-Iqbal Karachi","city":"Karachi","province":"Sindh"}', NOW() - INTERVAL '1 day'),
  ('ord-008', 'STPY-1008', 'pending',     'cod',        'pending', 2800,  '{"name":"Hina Shah","phone":"03411234567","address":"House 7, University Road Peshawar","city":"Peshawar","province":"KPK"}', NOW() - INTERVAL '18 hours'),
  ('ord-009', 'STPY-1009', 'delivered',   'cod',        'paid',    18500, '{"name":"Hassan Raza","phone":"03351234567","address":"Street 3, Bahria Town Rawalpindi","city":"Rawalpindi","province":"Punjab"}', NOW() - INTERVAL '20 days'),
  ('ord-010', 'STPY-1010', 'delivered',   'bank',       'paid',    12300, '{"name":"Nadia Farooq","phone":"03121234567","address":"House 22, DHA Phase 2 Karachi","city":"Karachi","province":"Sindh"}', NOW() - INTERVAL '25 days')
ON CONFLICT (id) DO NOTHING;

-- Order items (linking products to orders)
INSERT INTO order_items (id, order_id, product_id, quantity, price, size, color)
VALUES
  ('oi-001', 'ord-001', 'prod-001', 1, 8500,  '42', 'Red/Black'),
  ('oi-002', 'ord-002', 'prod-002', 1, 11500, '41', 'White/Silver'),
  ('oi-003', 'ord-003', 'prod-004', 2, 1800,  '39', 'Beige'),
  ('oi-004', 'ord-003', 'prod-012', 1, 2800,  'One Size', 'Pink'),
  ('oi-005', 'ord-004', 'prod-009', 1, 18500, '42', 'Chicago Red'),
  ('oi-006', 'ord-004', 'prod-012', 1, 2800,  'One Size', 'Black'),
  ('oi-007', 'ord-005', 'prod-005', 1, 5500,  '38', 'Black'),
  ('oi-008', 'ord-006', 'prod-004', 1, 1800,  '37', 'White'),
  ('oi-009', 'ord-006', 'prod-017', 1, 1200,  '37', 'Red/Gold'),
  ('oi-010', 'ord-007', 'prod-006', 1, 7200,  '40', 'White/Blue'),
  ('oi-011', 'ord-008', 'prod-012', 1, 2800,  'One Size', 'White'),
  ('oi-012', 'ord-009', 'prod-009', 1, 18500, '43', 'Royal Blue'),
  ('oi-013', 'ord-010', 'prod-007', 1, 5500,  'One Size', 'Black'),
  ('oi-014', 'ord-010', 'prod-015', 1, 4800,  'One Size', 'Black'),
  ('oi-015', 'ord-010', 'prod-013', 1, 9800,  '42', 'Black/White')
ON CONFLICT (id) DO NOTHING;

-- ─── 6. PROMO CODES ──────────────────────────────────────────
INSERT INTO promo_codes (id, code, discount_type, discount_value, min_order_amount, max_uses, current_uses, is_active, expires_at)
VALUES
  ('promo-001', 'WELCOME10',  'percentage', 10, 2000,  500, 127, true,  NOW() + INTERVAL '30 days'),
  ('promo-002', 'STOPY20',    'percentage', 20, 5000,  200, 89,  true,  NOW() + INTERVAL '15 days'),
  ('promo-003', 'EID50',      'fixed',      50, 3000,  1000, 0,  false, NOW() - INTERVAL '5 days'),
  ('promo-004', 'NEWUSER',    'percentage', 15, 1500,  1000, 45, true,  NOW() + INTERVAL '60 days'),
  ('promo-005', 'FLASH500',   'fixed',      500, 8000, 100,  23, true,  NOW() + INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- ─── 7. STOCK ALERTS ─────────────────────────────────────────
INSERT INTO stock_alerts (id, product_id, stock_level, alert_type, is_resolved, created_at)
VALUES
  ('sa-001', 'prod-009', 12, 'low_stock',   false, NOW() - INTERVAL '2 days'),
  ('sa-002', 'prod-005', 25, 'low_stock',   false, NOW() - INTERVAL '3 days'),
  ('sa-003', 'prod-020', 22, 'low_stock',   false, NOW() - INTERVAL '1 day'),
  ('sa-004', 'prod-003', 60, 'restock',     true,  NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Seed complete ✓' AS status,
  (SELECT COUNT(*) FROM products) AS products,
  (SELECT COUNT(*) FROM reviews) AS reviews,
  (SELECT COUNT(*) FROM orders) AS orders,
  (SELECT COUNT(*) FROM categories) AS categories,
  (SELECT COUNT(*) FROM banners) AS banners,
  (SELECT COUNT(*) FROM promo_codes) AS promo_codes;
