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
    role ENUM('shopper', 'store_owner', 'admin') NOT NULL DEFAULT 'shopper',
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
-- Malls
-- ---------------------------------------------------------------------
CREATE TABLE malls (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    address VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    logo_url VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
    mall_id INT UNSIGNED NULL,
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
    instagram VARCHAR(150) NULL,
    status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mall_id) REFERENCES malls(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_stores_status (status),
    INDEX idx_stores_location (latitude, longitude)
) ENGINE=InnoDB;

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
    views_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_offers_status (status),
    INDEX idx_offers_expires (expires_at)
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
