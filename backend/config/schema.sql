-- GMLS (mall/store offers app) database schema
-- Import via phpMyAdmin or: mysql -u root gmls < schema.sql

CREATE DATABASE IF NOT EXISTS gmls CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gmls;

-- ---------------------------------------------------------------------
-- Users (shoppers, store owners, admins)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    -- store_owner is displayed as "Store Manager" in the UI; the DB value is
    -- unchanged to avoid a large low-value rename across the codebase.
    -- super_admin can do everything 'admin' can (see require_role()/is_admin()
    -- in lib/auth.php) plus manage admin/super_admin accounts and view the
    -- payments ledger (endpoints/admins/*, endpoints/payments/list.php).
    -- Neither register.php nor any public flow can create this role — the
    -- first super_admin is always seeded directly in the database.
    role ENUM('shopper', 'store_owner', 'mall_manager', 'mall_staff', 'store_staff', 'admin', 'super_admin') NOT NULL DEFAULT 'shopper',
    -- Set for role=mall_manager/mall_staff; the mall they represent. FK added after `malls` exists below.
    mall_id INT UNSIGNED NULL,
    -- Set only for role=store_staff; the single store they represent (submits
    -- offers/edits for that store's manager to approve). FK added after `stores` exists below.
    store_id INT UNSIGNED NULL,
    avatar_url VARCHAR(255) NULL,
    fcm_token VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Auth tokens (simple bearer tokens, one row per active session)
CREATE TABLE auth_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Cities (managed by admins; drives the home screen's city picker)
-- ---------------------------------------------------------------------
CREATE TABLE cities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Malls
-- ---------------------------------------------------------------------
CREATE TABLE malls (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    address VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    -- Official email domain (e.g. "westfield.com"); mall_manager signups for
    -- this mall must use an email ending in "@" + this domain.
    email_domain VARCHAR(190) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    logo_url VARCHAR(255) NULL,
    -- Plain "follow us" links, editable by whoever can edit this mall
    -- (manager or staff) — same as name/description/address below.
    instagram_channel_url VARCHAR(255) NULL,
    youtube_channel_url VARCHAR(255) NULL,
    facebook_channel_url VARCHAR(255) NULL,
    twitter_channel_url VARCHAR(255) NULL,
    -- One featured post/video per platform, embedded inline on the mall's
    -- public page. Settable only by mall_staff (or admin) — never the
    -- mall_manager directly — same reasoning as
    -- stores.embed_instagram_url/embed_youtube_url. See malls/update.php.
    embed_instagram_url VARCHAR(255) NULL,
    embed_youtube_url VARCHAR(255) NULL,
    embed_facebook_url VARCHAR(255) NULL,
    embed_twitter_url VARCHAR(255) NULL,
    -- Mirrors stores.google_place_id — set by the mall manager, used to
    -- fetch this mall's Google rating (see backend/lib/google_places.php)
    -- for the admin Analytics tab. Cache columns below avoid calling the
    -- (paid, rate-limited) Places API on every page view — refreshed only
    -- via admin/refresh_ratings.php.
    google_place_id VARCHAR(255) NULL,
    google_rating DECIMAL(2, 1) NULL,
    google_rating_count INT UNSIGNED NULL,
    google_rating_fetched_at DATETIME NULL,
    -- Malls admin creates are 'approved' (live) immediately. A mall_staff or
    -- mall_manager profile edit goes back to 'pending'; mall_manager sign-off
    -- moves it to 'manager_approved' (not yet live) until an app admin gives
    -- final approval — mirrors the store_staff -> store_owner -> admin chain.
    status ENUM('pending', 'manager_approved', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    review_note TEXT NULL,
    -- Who last submitted a profile edit — lets the mall manager approve a
    -- staff edit without ever approving their own.
    last_edited_by INT UNSIGNED NULL,
    -- Paid ad-upload credits, purchased via Razorpay (see payments table).
    -- Every mall_ads upload for this mall — by the manager or their staff —
    -- consumes one credit; uploads are refused once this hits zero.
    -- Superseded by subscription_expires_at below as the mall_ads gate;
    -- left in place unused (never written to for malls going forward).
    ad_credits INT UNSIGNED NOT NULL DEFAULT 0,
    -- Mall ad-upload subscription (Monthly/Quarterly/Half-Yearly/Yearly, see
    -- rate_cards), purchased via Razorpay or granted by an admin. NULL or a
    -- past datetime means mall_ads uploads are blocked — see mall_ads/create.php.
    subscription_expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE users ADD CONSTRAINT fk_users_mall FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Categories (Fashion, Electronics, Food, ...)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(80) NULL,
    sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Stores (owned by a user with role=store_owner, optionally inside a mall)
-- ---------------------------------------------------------------------
CREATE TABLE stores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_id INT UNSIGNED NOT NULL,
    -- Who last submitted an edit (owner or their store_staff) — lets the
    -- store manager approve a staff edit without ever approving their own.
    last_edited_by INT UNSIGNED NULL,
    mall_id INT UNSIGNED NULL,
    city VARCHAR(100) NULL,
    category_id INT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    logo_url VARCHAR(255) NULL,
    cover_url VARCHAR(255) NULL,
    address VARCHAR(255) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    phone VARCHAR(30) NULL,
    website VARCHAR(255) NULL,
    whatsapp VARCHAR(30) NULL,
    -- Plain "follow us" links, editable by anyone who can_manage_store()
    -- (owner or staff), same as website/whatsapp above.
    instagram_channel_url VARCHAR(255) NULL,
    youtube_channel_url VARCHAR(255) NULL,
    facebook_channel_url VARCHAR(255) NULL,
    twitter_channel_url VARCHAR(255) NULL,
    -- One featured post/video per platform, embedded inline on the store's
    -- public page. Settable only by store_staff (or admin) — never the
    -- store_owner directly — so featuring content is a
    -- task the owner reviews via the normal pending/approved chain rather
    -- than something they hand themselves. See stores/update.php.
    embed_instagram_url VARCHAR(255) NULL,
    embed_youtube_url VARCHAR(255) NULL,
    embed_facebook_url VARCHAR(255) NULL,
    embed_twitter_url VARCHAR(255) NULL,
    -- Store policies shown in the public store page's footer. No separate
    -- visibility toggle — the footer section only renders once at least one
    -- of these is set, same presence-based pattern as the embed fields above.
    -- External URLs (if set) are used instead of the free-text versions.
    terms_text TEXT NULL,
    privacy_text TEXT NULL,
    refund_text TEXT NULL,
    shipping_text TEXT NULL,
    terms_url VARCHAR(255) NULL,
    privacy_url VARCHAR(255) NULL,
    -- Powers the "Google reviews" button on the store page — a deep link to
    -- the store's real Google listing (search.google.com/local/reviews and
    -- .../writereview).
    google_place_id VARCHAR(255) NULL,
    -- Cached Google rating for the admin Analytics tab (see
    -- backend/lib/google_places.php) — refreshed only via
    -- admin/refresh_ratings.php, never fetched live on a page view.
    google_rating DECIMAL(2, 1) NULL,
    google_rating_count INT UNSIGNED NULL,
    google_rating_fetched_at DATETIME NULL,
    -- 'manager_approved': the store manager signed off on a store_staff edit,
    -- but it isn't live yet — an app admin still has to give final approval
    -- before it publishes. Unrelated to a mall manager's approval of a brand
    -- new store submitted by its owner, which still goes straight to
    -- 'approved' (see admin/review_store.php).
    status ENUM('pending', 'manager_approved', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    -- Set when a manager or admin rejects a store; explains why so the owner/staff can fix it.
    review_note TEXT NULL,
    -- Paid ad-upload credits, purchased via Razorpay (see payments table).
    -- Every store_ads upload — by the manager or their staff — consumes one
    -- credit; uploads are refused once this hits zero.
    ad_credits INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_stores_status (status),
    INDEX idx_stores_location (latitude, longitude)
) ENGINE=InnoDB;

ALTER TABLE users ADD CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Offers / discounts posted by stores
-- ---------------------------------------------------------------------
CREATE TABLE offers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(255) NULL,
    original_price DECIMAL(10, 2) NULL,
    discounted_price DECIMAL(10, 2) NULL,
    discount_percent TINYINT UNSIGNED NULL,
    starts_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
    -- Who created or last edited this offer — lets the store manager approve
    -- an offer their own store_staff submitted, without ever approving one
    -- they submitted themselves.
    submitted_by INT UNSIGNED NULL,
    views_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_offers_status (status),
    INDEX idx_offers_expires (expires_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Store product gallery — plain photos of what a store sells, distinct
-- from `offers` (no pricing/discount/expiry). No approval chain: goes live
-- immediately, uploadable by either the store_owner or their store_staff —
-- lower stakes than offers/ads, so the extra review step isn't worth it.
-- ---------------------------------------------------------------------
CREATE TABLE store_products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    caption VARCHAR(150) NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_store_products_store (store_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Opt-in shoppers who want WhatsApp updates from a specific store. GLML
-- does not send these messages itself (see store_whatsapp/export.php's
-- docblock) — this table exists purely so a store can export the list and
-- use it with their own phone or a third-party WhatsApp Business tool.
-- ---------------------------------------------------------------------
CREATE TABLE store_whatsapp_subscribers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    phone VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_store_user (store_id, user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Favorites / saved offers
-- ---------------------------------------------------------------------
CREATE TABLE favorites (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    offer_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_offer (user_id, offer_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Home page banner carousel (managed by admins only)
-- ---------------------------------------------------------------------
CREATE TABLE banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255) NULL,
    -- NULL start_at = already active; NULL end_at = no scheduled end. Gated
    -- via (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR
    -- end_at >= NOW()) — see banners/list.php.
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- City banner carousel (like `banners`, but scoped to one city's page —
-- managed by admins only; sold as premium inventory, arranged over email)
-- ---------------------------------------------------------------------
CREATE TABLE city_banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255) NULL,
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_city_banners_city_window (city, start_at, end_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Rate cards (admin-editable pricing for App/City banner slots and mall ad
-- subscriptions — the first DB-backed pricing in the schema; everything else
-- payment-related is still a hardcoded constant in config/razorpay.php)
-- ---------------------------------------------------------------------
CREATE TABLE rate_cards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_key VARCHAR(40) NOT NULL UNIQUE,
    tier ENUM('app_banner', 'city_banner', 'mall_subscription') NOT NULL,
    label VARCHAR(100) NOT NULL,
    amount INT UNSIGNED NOT NULL COMMENT 'in paise, admin-editable',
    -- app_banner/city_banner rows: informational only (pre-fills the admin's
    -- date picker). mall_subscription rows: authoritative — the number of
    -- days razorpay_fulfill_payment()/mall_extend_subscription() extends
    -- malls.subscription_expires_at by.
    duration_days SMALLINT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO rate_cards (plan_key, tier, label, amount, duration_days) VALUES
    ('app_weekend',      'app_banner',        'Weekend Plan (Fri-Sun)',   700000,  3),
    ('app_weekday',      'app_banner',        'Weekday Plan (Mon-Thu)',   350000,  4),
    ('city_weekend',     'city_banner',       'Weekend Plan (Fri-Sun)',   500000,  3),
    ('city_weekday',     'city_banner',       'Weekday Plan (Mon-Thu)',   250000,  4),
    ('mall_weekly',      'mall_subscription', 'Weekly',                  450000,  7),
    ('mall_monthly',     'mall_subscription', 'Monthly',                1500000, 30),
    ('mall_quarterly',   'mall_subscription', 'Quarterly',              3000000, 90),
    ('mall_half_yearly', 'mall_subscription', 'Half-Yearly',            5000000, 182),
    ('mall_yearly',      'mall_subscription', 'Yearly',                12000000, 365);

-- ---------------------------------------------------------------------
-- Contact Us messages (submitted by any signed-in user; reviewed by admins)
-- ---------------------------------------------------------------------
CREATE TABLE contact_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    query_type VARCHAR(100) NOT NULL,
    city VARCHAR(100) NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_contact_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Mall ads (header-banner submissions for a mall's own page, uploaded by
-- mall_staff and approved by that mall's mall_manager)
-- ---------------------------------------------------------------------
CREATE TABLE mall_ads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mall_id INT UNSIGNED NOT NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255) NULL,
    -- 'manager_approved': the mall manager signed off on a staff-uploaded ad,
    -- but it isn't live yet — an app admin still has to give final approval
    -- before it publishes. A manager's own direct upload skips both review
    -- stages and goes straight to 'approved' (see mall_ads/create.php).
    status ENUM('pending', 'manager_approved', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    -- Set when a manager or admin rejects an ad; explains why so staff can fix it.
    review_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Set only when the ad's image/link is actually edited (mall_ads/update.php),
    -- not on every status change, so the UI can distinguish "replaced/edited"
    -- from a plain approve/reject.
    edited_at DATETIME NULL,
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_mall_ads_mall_status (mall_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Store ads (promotional banners on a store's own page, uploaded by
-- store_staff and approved by that store's store_owner) — the store-level
-- counterpart to mall_ads.
-- ---------------------------------------------------------------------
CREATE TABLE store_ads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id INT UNSIGNED NOT NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255) NULL,
    -- What this banner is advertising — plain descriptive tags (e.g.
    -- product_name='Shirt', brand_name='Arrow'), not a link to a product
    -- catalog or a brand-ownership hierarchy. Optional, set at upload time.
    -- Also reportable via payments.product_name/brand_name below, since a
    -- store_ad_credits purchase isn't tied to one specific banner (credits
    -- are a pooled balance).
    product_name VARCHAR(150) NULL,
    brand_name VARCHAR(150) NULL,
    -- 'manager_approved': the store manager signed off on a staff-uploaded
    -- ad, but it isn't live yet — an app admin still has to give final
    -- approval before it publishes. A manager's own direct upload skips both
    -- review stages and goes straight to 'approved' (see store_ads/create.php).
    status ENUM('pending', 'manager_approved', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    review_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    edited_at DATETIME NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_store_ads_store_status (store_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Payments (Razorpay). Purposes today:
--   'store_listing'     — one-time fee a store_owner pays before their first
--                         store can be created (target_id NULL). Consumed
--                         ("spent") by stores/create.php, which is a
--                         different moment than when it's paid, so
--                         fulfilled_at tracks that separately from status.
--   'store_ad_credits'  — store_owner buys `quantity` ad upload credits for
--                         one of their stores (target_id = stores.id).
--                         Credited to stores.ad_credits immediately.
--   'mall_subscription' — mall_manager buys a rate_cards.plan_key subscription
--                         window for their mall (target_id = malls.id).
--                         Extends malls.subscription_expires_at immediately.
-- ---------------------------------------------------------------------
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'store_listing',
    -- 'razorpay' (web) or 'revenuecat' (Apple Pay/Google Pay via the app —
    -- see lib/revenuecat.php). Only mall_subscription is purchasable through
    -- RevenueCat today; everything else stays razorpay-only.
    provider VARCHAR(20) NOT NULL DEFAULT 'razorpay',
    -- 'mall' or 'store', paired with target_id — NULL for store_listing.
    target_type VARCHAR(20) NULL,
    target_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    -- Set only for purpose='mall_subscription' — which rate_cards row was
    -- purchased, so razorpay_fulfill_payment()/revenuecat_fulfill_mall_subscription()
    -- knows the duration_days to apply without reverse-looking-up an
    -- (editable) price. For RevenueCat this is the product identifier,
    -- which must match the plan_key exactly (see backend/lib/revenuecat.php).
    plan_key VARCHAR(40) NULL,
    -- Set only for purpose='store_ad_credits' — an optional tag of which
    -- product/brand campaign these credits are being bought for (matches
    -- store_ads.product_name/brand_name above; not FK-linked to one banner
    -- since credits are a pooled balance spent later, possibly across
    -- several banners). Lets the admin Reports tab filter payments directly
    -- by product/brand without needing per-banner payment traceability.
    product_name VARCHAR(150) NULL,
    brand_name VARCHAR(150) NULL,
    amount INT UNSIGNED NOT NULL COMMENT 'in paise',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    -- NULL for provider='revenuecat' (there's no pre-created "order" for an
    -- in-app-purchase — the store product itself is the order).
    razorpay_order_id VARCHAR(64) NULL,
    razorpay_payment_id VARCHAR(64) NULL,
    -- Set only for provider='revenuecat' — RevenueCat's transaction id,
    -- unique-indexed below so a re-sent webhook can't fulfill twice.
    revenuecat_transaction_id VARCHAR(120) NULL,
    status ENUM('created', 'paid', 'failed') NOT NULL DEFAULT 'created',
    -- Set once the payment's benefit has actually been applied — immediately
    -- on payment success for credit purposes, or later (at store creation)
    -- for the voucher-style store_listing purpose. NULL means "not yet spent".
    fulfilled_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_payments_order (razorpay_order_id),
    UNIQUE INDEX idx_payments_revenuecat_txn (revenuecat_transaction_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Push notification log (what was sent, for reporting)
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    offer_id INT UNSIGNED NULL,
    title VARCHAR(180) NOT NULL,
    body VARCHAR(255) NOT NULL,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Per-recipient in-app notification inbox (poll-and-badge, no push) — e.g.
-- alerting a mall_manager that a new mall_ads request is pending review.
-- Distinct from `notifications` above, which is a recipient-less broadcast
-- log for the FCM push path and has no read/unread state.
-- ---------------------------------------------------------------------
CREATE TABLE user_notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    -- Identifies what the notification is about and how the app should
    -- navigate on tap (e.g. 'mall_ad_pending') — `data` carries the id(s)
    -- the target screen needs (e.g. {"mall_ad_id": 42}).
    type VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    body VARCHAR(255) NOT NULL,
    data JSON NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_notifications_user (user_id, is_read)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Business-level incidents (payment failures, banner publish failures,
-- failed logins, RevenueCat webhook failures, etc.) — recorded via
-- lib/incidents.php, reviewed/annotated from the admin Incidents tab.
-- Distinct from the errors.log file (lib/error_logging.php), which is for
-- uncaught PHP exceptions/warnings, not business events.
-- ---------------------------------------------------------------------
CREATE TABLE incidents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'warning',
    -- Repeats of the same underlying problem within a short window (e.g. the
    -- same email failing to log in) collapse into one row instead of one row
    -- per occurrence — see record_incident()'s dedupe_key/window params.
    dedupe_key VARCHAR(191) NULL,
    occurrences INT UNSIGNED NOT NULL DEFAULT 1,
    context JSON NULL,
    status ENUM('open', 'investigating', 'resolved') NOT NULL DEFAULT 'open',
    root_cause TEXT NULL,
    corrective_action TEXT NULL,
    first_seen_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_incidents_status (status),
    INDEX idx_incidents_type_dedupe (type, dedupe_key)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Seed categories
-- ---------------------------------------------------------------------
INSERT INTO categories (name, icon, sort_order) VALUES
    ('Fashion', 'checkroom', 1),
    ('Electronics', 'devices', 2),
    ('Food & Dining', 'restaurant', 3),
    ('Beauty & Health', 'spa', 4),
    ('Home & Furniture', 'chair', 5),
    ('Groceries', 'local_grocery_store', 6),
    ('Kids & Toys', 'toys', 7),
    ('Sports & Fitness', 'fitness_center', 8);

-- ---------------------------------------------------------------------
-- Seed major Indian cities
-- ---------------------------------------------------------------------
INSERT INTO cities (name) VALUES
    ('Ahmedabad'), ('Bengaluru'), ('Bhopal'), ('Bhubaneswar'), ('Chandigarh'), ('Chennai'),
    ('Coimbatore'), ('Delhi'), ('Ghaziabad'), ('Guwahati'), ('Hyderabad'), ('Indore'),
    ('Jaipur'), ('Jammu'), ('Kanpur'), ('Kochi'), ('Kolkata'), ('Lucknow'), ('Ludhiana'),
    ('Mumbai'), ('Mysuru'), ('Nagpur'), ('Nashik'), ('Noida'), ('Patna'), ('Pune'),
    ('Raipur'), ('Rajkot'), ('Ranchi'), ('Surat'), ('Thane'), ('Thiruvananthapuram'),
    ('Vadodara'), ('Varanasi'), ('Visakhapatnam');
