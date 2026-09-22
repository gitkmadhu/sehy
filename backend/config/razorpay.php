<?php
// Razorpay API credentials — get these from https://dashboard.razorpay.com/app/keys
// Use TEST mode keys (rzp_test_...) while developing; switch to LIVE keys only once
// ready to accept real payments. Set these as environment variables in
// production; never commit real LIVE keys to a public repo.
define('RAZORPAY_KEY_ID', getenv('RAZORPAY_KEY_ID') !== false ? getenv('RAZORPAY_KEY_ID') : 'rzp_test_REPLACE_ME');
define('RAZORPAY_KEY_SECRET', getenv('RAZORPAY_KEY_SECRET') !== false ? getenv('RAZORPAY_KEY_SECRET') : 'REPLACE_ME');

// Set this after creating a webhook in the Razorpay dashboard (Settings > Webhooks),
// pointed at https://yourdomain.com/sehy_api/endpoints/payments/webhook.php
// with the "payment.captured" event enabled.
define('RAZORPAY_WEBHOOK_SECRET', getenv('RAZORPAY_WEBHOOK_SECRET') !== false ? getenv('RAZORPAY_WEBHOOK_SECRET') : 'REPLACE_ME');

// Flat one-time fee for a service owner to list their first service on the
// platform, in paise (Razorpay's smallest currency unit — 100 paise = ₹1).
const LISTING_FEE_AMOUNT = 99900; // ₹999.00
const LISTING_FEE_CURRENCY = 'INR';

// Price per hero-banner ad upload credit (category_ads or service_ads), in paise.
// Purchased in bulk (quantity) by a category manager / service manager.
const AD_CREDIT_PRICE = 9900; // ₹99.00 per credit
const AD_CREDIT_CURRENCY = 'INR';
