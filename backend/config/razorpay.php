<?php
// Razorpay API credentials — get these from https://dashboard.razorpay.com/app/keys
// Use TEST mode keys (rzp_test_...) while developing; switch to LIVE keys only once
// ready to accept real payments. Never commit real LIVE keys to a public repo.
const RAZORPAY_KEY_ID = 'rzp_test_REPLACE_ME';
const RAZORPAY_KEY_SECRET = 'REPLACE_ME';

// Set this after creating a webhook in the Razorpay dashboard (Settings > Webhooks),
// pointed at https://yourdomain.com/gmls_api/endpoints/payments/webhook.php
// with the "payment.captured" event enabled.
const RAZORPAY_WEBHOOK_SECRET = 'REPLACE_ME';

// Flat one-time fee for a store owner to list their first store on the
// platform, in paise (Razorpay's smallest currency unit — 100 paise = ₹1).
const LISTING_FEE_AMOUNT = 99900; // ₹999.00
const LISTING_FEE_CURRENCY = 'INR';

// Price per hero-banner ad upload credit (mall_ads or store_ads), in paise.
// Purchased in bulk (quantity) by a mall manager / store manager.
const AD_CREDIT_PRICE = 9900; // ₹99.00 per credit
const AD_CREDIT_CURRENCY = 'INR';
