<?php
// RevenueCat project credentials — get these from https://app.revenuecat.com
// (Project settings > API keys). This is the SECRET key (server-side REST
// calls, used by revenuecat_sync.php) — never the public SDK key, which
// belongs in the Flutter app's own config instead. Set
// REVENUECAT_SECRET_API_KEY as an environment variable in production;
// never commit a real value here.
define('REVENUECAT_SECRET_API_KEY', getenv('REVENUECAT_SECRET_API_KEY') !== false ? getenv('REVENUECAT_SECRET_API_KEY') : 'REPLACE_ME');

// The exact value you set as the "Authorization" header when creating the
// webhook in the RevenueCat dashboard (Project settings > Integrations >
// Webhooks), pointed at
// https://yourdomain.com/sehy_api/endpoints/payments/revenuecat_webhook.php
define('REVENUECAT_WEBHOOK_AUTH_HEADER', getenv('REVENUECAT_WEBHOOK_AUTH_HEADER') !== false ? getenv('REVENUECAT_WEBHOOK_AUTH_HEADER') : 'REPLACE_ME');

// The entitlement identifier configured in the RevenueCat dashboard
// (Entitlements > +New), attached to every category_subscription product
// (mall_weekly/monthly/quarterly/half_yearly/yearly — these product ids are
// registered in the App Store/Play Store consoles and are NOT renamed along
// with the rest of this codebase's mall->category rename, to avoid breaking
// live in-app-purchase products) there. Both the server (lib/revenuecat.php)
// and the app (lib/core/purchases/purchase_service.dart) key off this same
// string — keep them in sync if it's ever renamed in the dashboard.
const REVENUECAT_ENTITLEMENT_ID = 'mall_ad_subscription';
