-- Sehy (category/service classifieds app) database schema
-- Import via phpMyAdmin or: mysql -u root sehy < schema.sql

CREATE DATABASE IF NOT EXISTS sehy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sehy;

-- ---------------------------------------------------------------------
-- Users (shoppers, service owners, admins)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    -- Set once register.php verifies a Firebase phone-auth ID token for
    -- service_owner/category_manager signups (see lib/kyc.php) — NULL for every
    -- other role, and for accounts created before this check existed.
    mobile_verified_at DATETIME NULL,
    -- service_owner is displayed as "Service Manager" in the UI; the DB value is
    -- unchanged to avoid a large low-value rename across the codebase.
    -- super_admin can do everything 'admin' can (see require_role()/is_admin()
    -- in lib/auth.php) plus manage admin/super_admin accounts and view the
    -- payments ledger (endpoints/admins/*, endpoints/payments/list.php).
    -- Neither register.php nor any public flow can create this role — the
    -- first super_admin is always seeded directly in the database.
    role ENUM('shopper', 'service_owner', 'category_manager', 'category_staff', 'service_staff', 'admin', 'super_admin') NOT NULL DEFAULT 'shopper',
    -- Set for role=category_manager/category_staff; the category they represent. FK added after `categories` exists below.
    category_id INT UNSIGNED NULL,
    -- Set only for role=service_staff; the single service they represent (submits
    -- offers/edits for that service's manager to approve). FK added after `services` exists below.
    service_id INT UNSIGNED NULL,
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
-- Areas (managed by admins; drives the home screen's area picker)
-- ---------------------------------------------------------------------
CREATE TABLE areas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    address VARCHAR(255) NULL,
    area VARCHAR(100) NULL,
    -- Official email domain (e.g. "westfield.com"); category_manager signups for
    -- this category must use an email ending in "@" + this domain.
    email_domain VARCHAR(190) NULL,
    -- Category management entity's GST/PAN, submitted by the first category_manager
    -- to register for this category (see auth/register.php) — at least one of
    -- the two is required (see lib/kyc.php's require_gstin_or_pan), format/
    -- checksum validated. Admin reviews these by eye alongside the rest of
    -- the signup, and can trigger the paid registry lookup below on demand
    -- (see admin/verify_kyc.php) — never automatic.
    gstin VARCHAR(15) NULL,
    pan VARCHAR(10) NULL,
    -- Results of that on-demand paid lookup (lib/eko_kyc.php) — NULL until
    -- admin actually clicks "Verify". gst_registry_name/pan_registry_name
    -- are what the registry says the business is called, for admin to eye-
    -- ball against the submitted name; no automated matching/rejection.
    gst_verified_status VARCHAR(50) NULL,
    gst_registry_name VARCHAR(255) NULL,
    pan_verified_status VARCHAR(50) NULL,
    pan_registry_name VARCHAR(255) NULL,
    kyc_verified_at DATETIME NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    logo_url VARCHAR(255) NULL,
    -- Plain "follow us" links, editable by whoever can edit this category
    -- (manager or staff) — same as name/description/address below.
    instagram_channel_url VARCHAR(255) NULL,
    youtube_channel_url VARCHAR(255) NULL,
    facebook_channel_url VARCHAR(255) NULL,
    twitter_channel_url VARCHAR(255) NULL,
    -- One featured post/video per platform, embedded inline on the category's
    -- public page. Settable only by category_staff (or admin) — never the
    -- category_manager directly — same reasoning as
    -- services.embed_instagram_url/embed_youtube_url. See categories/update.php.
    embed_instagram_url VARCHAR(255) NULL,
    embed_youtube_url VARCHAR(255) NULL,
    embed_facebook_url VARCHAR(255) NULL,
    embed_twitter_url VARCHAR(255) NULL,
    -- Mirrors services.google_place_id — set by the category manager, used to
    -- fetch this category's Google rating (see backend/lib/google_places.php)
    -- for the admin Analytics tab. Cache columns below avoid calling the
    -- (paid, rate-limited) Places API on every page view — refreshed only
    -- via admin/refresh_ratings.php.
    google_place_id VARCHAR(255) NULL,
    google_rating DECIMAL(2, 1) NULL,
    google_rating_count INT UNSIGNED NULL,
    google_rating_fetched_at DATETIME NULL,
    -- Categories admin creates are 'approved' (live) immediately. A category_staff or
    -- category_manager profile edit goes back to 'pending'; category_manager sign-off
    -- moves it to 'manager_approved' (not yet live) until an app admin gives
    -- final approval — mirrors the service_staff -> service_owner -> admin chain.
    status ENUM('pending', 'manager_approved', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    review_note TEXT NULL,
    -- Who last submitted a profile edit — lets the category manager approve a
    -- staff edit without ever approving their own.
    last_edited_by INT UNSIGNED NULL,
    -- Paid ad-upload credits, purchased via Razorpay (see payments table).
    -- Every category_ads upload for this category — by the manager or their staff —
    -- consumes one credit; uploads are refused once this hits zero.
    -- Superseded by subscription_expires_at below as the category_ads gate;
    -- left in place unused (never written to for categories going forward).
    ad_credits INT UNSIGNED NOT NULL DEFAULT 0,
    -- Category ad-upload subscription (Monthly/Quarterly/Half-Yearly/Yearly, see
    -- rate_cards), purchased via Razorpay or granted by an admin. NULL or a
    -- past datetime means category_ads uploads are blocked — see category_ads/create.php.
    subscription_expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE users ADD CONSTRAINT fk_users_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Tags (Fashion, Electronics, Food, ...)
-- ---------------------------------------------------------------------
CREATE TABLE tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(80) NULL,
    sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Services (owned by a user with role=service_owner, optionally inside a category)
-- ---------------------------------------------------------------------
CREATE TABLE services (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_id INT UNSIGNED NOT NULL,
    -- Who last submitted an edit (owner or their service_staff) — lets the
    -- service manager approve a staff edit without ever approving their own.
    last_edited_by INT UNSIGNED NULL,
    category_id INT UNSIGNED NULL,
    area VARCHAR(100) NULL,
    tag_id INT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    logo_url VARCHAR(255) NULL,
    cover_url VARCHAR(255) NULL,
    address VARCHAR(255) NULL,
    -- GST/PAN of the service's business entity (at least one required for
    -- service_owner submissions — see lib/kyc.php's require_gstin_or_pan) +
    -- a document proving it actually operates inside category_id (lease/
    -- allotment letter, image or PDF), format/checksum validated. Admin
    -- reviews these by eye and can trigger the paid registry lookup below
    -- on demand (see admin/verify_kyc.php) — never automatic.
    gstin VARCHAR(15) NULL,
    pan VARCHAR(10) NULL,
    -- Results of that on-demand paid lookup (lib/eko_kyc.php) — same
    -- shape/reasoning as categories.gst_verified_status etc. above.
    gst_verified_status VARCHAR(50) NULL,
    gst_registry_name VARCHAR(255) NULL,
    pan_verified_status VARCHAR(50) NULL,
    pan_registry_name VARCHAR(255) NULL,
    kyc_verified_at DATETIME NULL,
    allocation_proof_url VARCHAR(255) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    phone VARCHAR(30) NULL,
    website VARCHAR(255) NULL,
    -- Contact email for customer inquiries — distinct from the owner's own
    -- login email, since a service may want a different one. Required on
    -- creation (see services/create.php); NULL only on services that existed
    -- before this field was added.
    email VARCHAR(190) NULL,
    -- Free-text wayfinding/detail, not structured — kept low-friction to
    -- fill in rather than a rigid schema (e.g. per-day open/close times).
    floor_unit VARCHAR(100) NULL,
    opening_hours VARCHAR(255) NULL,
    -- One-line hook shown in list/card views where the full description
    -- doesn't fit (e.g. "Delhi's favorite biryani spot").
    tagline VARCHAR(160) NULL,
    whatsapp VARCHAR(30) NULL,
    -- Plain "follow us" links, editable by anyone who can_manage_service()
    -- (owner or staff), same as website/whatsapp above.
    instagram_channel_url VARCHAR(255) NULL,
    youtube_channel_url VARCHAR(255) NULL,
    facebook_channel_url VARCHAR(255) NULL,
    twitter_channel_url VARCHAR(255) NULL,
    -- One featured post/video per platform, embedded inline on the service's
    -- public page. Settable only by service_staff (or admin) — never the
    -- service_owner directly — so featuring content is a
    -- task the owner reviews via the normal pending/approved chain rather
    -- than something they hand themselves. See services/update.php.
    embed_instagram_url VARCHAR(255) NULL,
    embed_youtube_url VARCHAR(255) NULL,
    embed_facebook_url VARCHAR(255) NULL,
    embed_twitter_url VARCHAR(255) NULL,
    -- Service policies shown in the public service page's footer. No separate
    -- visibility toggle — the footer section only renders once at least one
    -- of these is set, same presence-based pattern as the embed fields above.
    -- External URLs (if set) are used instead of the free-text versions.
    terms_text TEXT NULL,
    privacy_text TEXT NULL,
    refund_text TEXT NULL,
    shipping_text TEXT NULL,
    terms_url VARCHAR(255) NULL,
    privacy_url VARCHAR(255) NULL,
    -- Powers the "Google reviews" button on the service page — a deep link to
    -- the service's real Google listing (search.google.com/local/reviews and
    -- .../writereview).
    google_place_id VARCHAR(255) NULL,
    -- Cached Google rating for the admin Analytics tab (see
    -- backend/lib/google_places.php) — refreshed only via
    -- admin/refresh_ratings.php, never fetched live on a page view.
    google_rating DECIMAL(2, 1) NULL,
    google_rating_count INT UNSIGNED NULL,
    google_rating_fetched_at DATETIME NULL,
    -- 'manager_approved': the service manager signed off on a service_staff edit,
    -- but it isn't live yet — an app admin still has to give final approval
    -- before it publishes. Unrelated to a category manager's approval of a brand
    -- new service submitted by its owner, which still goes straight to
    -- 'approved' (see admin/review_service.php).
    status ENUM('pending', 'manager_approved', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    -- Set when a manager or admin rejects a service; explains why so the owner/staff can fix it.
    review_note TEXT NULL,
    -- Paid ad-upload credits, purchased via Razorpay (see payments table).
    -- Every service_ads upload — by the manager or their staff — consumes one
    -- credit; uploads are refused once this hits zero.
    ad_credits INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE SET NULL,
    INDEX idx_services_status (status),
    INDEX idx_services_location (latitude, longitude)
) ENGINE=InnoDB;

ALTER TABLE users ADD CONSTRAINT fk_users_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Offers / discounts posted by services
-- ---------------------------------------------------------------------
CREATE TABLE offers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_id INT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(255) NULL,
    original_price DECIMAL(10, 2) NULL,
    discounted_price DECIMAL(10, 2) NULL,
    discount_percent TINYINT UNSIGNED NULL,
    starts_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
    -- Who created or last edited this offer — lets the service manager approve
    -- an offer their own service_staff submitted, without ever approving one
    -- they submitted themselves.
    submitted_by INT UNSIGNED NULL,
    views_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE SET NULL,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_offers_status (status),
    INDEX idx_offers_expires (expires_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Service product gallery — plain photos of what a service sells, distinct
-- from `offers` (no pricing/discount/expiry). No approval chain: goes live
-- immediately, uploadable by either the service_owner or their service_staff —
-- lower stakes than offers/ads, so the extra review step isn't worth it.
-- ---------------------------------------------------------------------
CREATE TABLE service_products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_id INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    caption VARCHAR(150) NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_service_products_service (service_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Opt-in shoppers who want WhatsApp updates from a specific service. GLML
-- does not send these messages itself (see service_whatsapp/export.php's
-- docblock) — this table exists purely so a service can export the list and
-- use it with their own phone or a third-party WhatsApp Business tool.
-- ---------------------------------------------------------------------
CREATE TABLE service_whatsapp_subscribers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    phone VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_service_user (service_id, user_id)
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
-- Area banner carousel (like `banners`, but scoped to one area's page —
-- managed by admins only; sold as premium inventory, arranged over email)
-- ---------------------------------------------------------------------
CREATE TABLE area_banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    area VARCHAR(100) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255) NULL,
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_area_banners_area_window (area, start_at, end_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Rate cards (admin-editable pricing for App/Area banner slots and category ad
-- subscriptions — the first DB-backed pricing in the schema; everything else
-- payment-related is still a hardcoded constant in config/razorpay.php)
-- ---------------------------------------------------------------------
CREATE TABLE rate_cards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_key VARCHAR(40) NOT NULL UNIQUE,
    tier ENUM('app_banner', 'area_banner', 'category_subscription') NOT NULL,
    label VARCHAR(100) NOT NULL,
    amount INT UNSIGNED NOT NULL COMMENT 'in paise, admin-editable',
    -- app_banner/area_banner rows: informational only (pre-fills the admin's
    -- date picker). category_subscription rows: authoritative — the number of
    -- days razorpay_fulfill_payment()/category_extend_subscription() extends
    -- categories.subscription_expires_at by.
    duration_days SMALLINT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO rate_cards (plan_key, tier, label, amount, duration_days) VALUES
    ('app_weekend',      'app_banner',        'Weekend Plan (Fri-Sun)',   700000,  3),
    ('app_weekday',      'app_banner',        'Weekday Plan (Mon-Thu)',   350000,  4),
    ('area_weekend',     'area_banner',       'Weekend Plan (Fri-Sun)',   500000,  3),
    ('area_weekday',     'area_banner',       'Weekday Plan (Mon-Thu)',   250000,  4),
    -- plan_key values below keep their "mall_" prefix even though the tier/
    -- table are renamed mall->category: these strings double as RevenueCat/
    -- App Store/Play Store in-app-purchase product ids (see
    -- config/revenuecat.php) and renaming them here would silently break
    -- live purchases without a matching dashboard change.
    ('mall_weekly',      'category_subscription', 'Weekly',                  450000,  7),
    ('mall_monthly',     'category_subscription', 'Monthly',                1500000, 30),
    ('mall_quarterly',   'category_subscription', 'Quarterly',              3000000, 90),
    ('mall_half_yearly', 'category_subscription', 'Half-Yearly',            5000000, 182),
    ('mall_yearly',      'category_subscription', 'Yearly',                12000000, 365);

-- ---------------------------------------------------------------------
-- Contact Us messages (submitted by any signed-in user; reviewed by admins)
-- ---------------------------------------------------------------------
CREATE TABLE contact_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    query_type VARCHAR(100) NOT NULL,
    area VARCHAR(100) NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_contact_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Category ads (header-banner submissions for a category's own page, uploaded by
-- category_staff and approved by that category's category_manager)
-- ---------------------------------------------------------------------
CREATE TABLE category_ads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255) NULL,
    -- 'manager_approved': the category manager signed off on a staff-uploaded ad,
    -- but it isn't live yet — an app admin still has to give final approval
    -- before it publishes. A manager's own direct upload skips both review
    -- stages and goes straight to 'approved' (see category_ads/create.php).
    status ENUM('pending', 'manager_approved', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    -- Set when a manager or admin rejects an ad; explains why so staff can fix it.
    review_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Set only when the ad's image/link is actually edited (category_ads/update.php),
    -- not on every status change, so the UI can distinguish "replaced/edited"
    -- from a plain approve/reject.
    edited_at DATETIME NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_category_ads_category_status (category_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Service ads (promotional banners on a service's own page, uploaded by
-- service_staff and approved by that service's service_owner) — the service-level
-- counterpart to category_ads.
-- ---------------------------------------------------------------------
CREATE TABLE service_ads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    service_id INT UNSIGNED NOT NULL,
    uploaded_by INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    link_url VARCHAR(255) NULL,
    -- What this banner is advertising — plain descriptive tags (e.g.
    -- product_name='Shirt', brand_name='Arrow'), not a link to a product
    -- catalog or a brand-ownership hierarchy. Optional, set at upload time.
    -- Also reportable via payments.product_name/brand_name below, since a
    -- service_ad_credits purchase isn't tied to one specific banner (credits
    -- are a pooled balance).
    product_name VARCHAR(150) NULL,
    brand_name VARCHAR(150) NULL,
    -- 'manager_approved': the service manager signed off on a staff-uploaded
    -- ad, but it isn't live yet — an app admin still has to give final
    -- approval before it publishes. A manager's own direct upload skips both
    -- review stages and goes straight to 'approved' (see service_ads/create.php).
    status ENUM('pending', 'manager_approved', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    review_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    edited_at DATETIME NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_service_ads_service_status (service_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Payments (Razorpay). Purposes today:
--   'service_listing'     — one-time fee a service_owner pays before their first
--                         service can be created (target_id NULL). Consumed
--                         ("spent") by services/create.php, which is a
--                         different moment than when it's paid, so
--                         fulfilled_at tracks that separately from status.
--   'service_ad_credits'  — service_owner buys `quantity` ad upload credits for
--                         one of their services (target_id = services.id).
--                         Credited to services.ad_credits immediately.
--   'category_subscription' — category_manager buys a rate_cards.plan_key subscription
--                         window for their category (target_id = categories.id).
--                         Extends categories.subscription_expires_at immediately.
-- ---------------------------------------------------------------------
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'service_listing',
    -- 'razorpay' (web) or 'revenuecat' (Apple Pay/Google Pay via the app —
    -- see lib/revenuecat.php). Only category_subscription is purchasable through
    -- RevenueCat today; everything else stays razorpay-only.
    provider VARCHAR(20) NOT NULL DEFAULT 'razorpay',
    -- 'category' or 'service', paired with target_id — NULL for service_listing.
    target_type VARCHAR(20) NULL,
    target_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    -- Set only for purpose='category_subscription' — which rate_cards row was
    -- purchased, so razorpay_fulfill_payment()/revenuecat_fulfill_category_subscription()
    -- knows the duration_days to apply without reverse-looking-up an
    -- (editable) price. For RevenueCat this is the product identifier,
    -- which must match the plan_key exactly (see backend/lib/revenuecat.php).
    plan_key VARCHAR(40) NULL,
    -- Set only for purpose='service_ad_credits' — an optional tag of which
    -- product/brand campaign these credits are being bought for (matches
    -- service_ads.product_name/brand_name above; not FK-linked to one banner
    -- since credits are a pooled balance spent later, possibly across
    -- several banners). Lets the admin Reports tab filter payments directly
    -- by product/brand without needing per-banner payment traceability.
    product_name VARCHAR(150) NULL,
    brand_name VARCHAR(150) NULL,
    amount INT UNSIGNED NOT NULL COMMENT 'in paise',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    -- NULL for provider='revenuecat' (there's no pre-created "order" for an
    -- in-app-purchase — the service product itself is the order).
    razorpay_order_id VARCHAR(64) NULL,
    razorpay_payment_id VARCHAR(64) NULL,
    -- Set only for provider='revenuecat' — RevenueCat's transaction id,
    -- unique-indexed below so a re-sent webhook can't fulfill twice.
    revenuecat_transaction_id VARCHAR(120) NULL,
    status ENUM('created', 'paid', 'failed') NOT NULL DEFAULT 'created',
    -- Set once the payment's benefit has actually been applied — immediately
    -- on payment success for credit purposes, or later (at service creation)
    -- for the voucher-style service_listing purpose. NULL means "not yet spent".
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
-- alerting a category_manager that a new category_ads request is pending review.
-- Distinct from `notifications` above, which is a recipient-less broadcast
-- log for the FCM push path and has no read/unread state.
-- ---------------------------------------------------------------------
CREATE TABLE user_notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    -- Identifies what the notification is about and how the app should
    -- navigate on tap (e.g. 'category_ad_pending') — `data` carries the id(s)
    -- the target screen needs (e.g. {"category_ad_id": 42}).
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
-- Audit trail of admin/super_admin actions (category/area/rate-card
-- management, approvals) — recorded via lib/activity_log.php, viewed from
-- the admin Activity Log tab. Not for routine self-service actions by
-- category_manager/service_owner/staff on their own resources.
-- ---------------------------------------------------------------------
CREATE TABLE admin_activity_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(40) NULL,
    target_id INT UNSIGNED NULL,
    details JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_activity_user (user_id),
    INDEX idx_admin_activity_created (created_at)
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
-- Seed tags (a service's type/tag within its category — e.g. a "Food &
-- Dining" service might also be tagged "Groceries")
-- ---------------------------------------------------------------------
INSERT INTO tags (name, icon, sort_order) VALUES
    ('Fashion', 'checkroom', 1),
    ('Electronics', 'devices', 2),
    ('Food & Dining', 'restaurant', 3),
    ('Beauty & Health', 'spa', 4),
    ('Home & Furniture', 'chair', 5),
    ('Groceries', 'local_grocery_store', 6),
    ('Kids & Toys', 'toys', 7),
    ('Sports & Fitness', 'fitness_center', 8);

-- ---------------------------------------------------------------------
-- Seed categories (the top-level sections shoppers browse within an area —
-- global, not tied to one specific area; category.area is left NULL)
-- ---------------------------------------------------------------------
INSERT INTO categories (name, status) VALUES
    ('Store', 'approved'),
    ('Services', 'approved'),
    ('Health', 'approved'),
    ('Finance', 'approved'),
    ('Real Estate', 'approved'),
    ('Education', 'approved'),
    ('Food & Dining', 'approved');

-- ---------------------------------------------------------------------
-- Seed Hyderabad/Secunderabad local areas
-- ---------------------------------------------------------------------
INSERT INTO areas (name) VALUES
    ('Secunderabad'), ('Abids'), ('Alwal'), ('Ameerpet'), ('AS Rao Nagar'), ('Attapur'),
    ('Bachupally'), ('Banjara Hills'), ('Begumpet'), ('Bolarum'), ('Bowenpally'),
    ('Chandanagar'), ('Charminar'), ('Dilsukhnagar'), ('ECIL'), ('Erragadda'),
    ('Gachibowli'), ('Habsiguda'), ('Hayathnagar'), ('Himayatnagar'), ('Hitech City'),
    ('Jubilee Hills'), ('Kachiguda'), ('Kapra'), ('Khairatabad'), ('Kompally'),
    ('Kondapur'), ('Kukatpally'), ('KPHB'), ('LB Nagar'), ('Madhapur'), ('Malakpet'),
    ('Malkajgiri'), ('Manikonda'), ('Marredpally'), ('Mehdipatnam'), ('Miyapur'),
    ('Moosapet'), ('Moula Ali'), ('Musheerabad'), ('Nacharam'), ('Nagole'),
    ('Nampally'), ('Narayanguda'), ('Neredmet'), ('Nizampet'), ('Panjagutta'),
    ('Punjagutta'), ('Rajendranagar'), ('Sainikpuri'), ('Sanathnagar'), ('Secretariat'),
    ('Shamshabad'), ('Somajiguda'), ('SR Nagar'), ('Tarnaka'), ('Tolichowki'),
    ('Trimulgherry'), ('Uppal'), ('Vanasthalipuram'), ('Yousufguda');
