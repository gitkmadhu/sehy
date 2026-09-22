import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:purchases_flutter/purchases_flutter.dart';

/// Apple Pay / Google Pay for a category_manager's/category_staff's ad subscription
/// — the mobile counterpart to Razorpay on the website. Configured lazily
/// (only category_manager/category_staff ever reach CategorySubscriptionScreen, so
/// there's no reason to spin up the SDK for a shopper session) and logs the
/// RevenueCat subscriber in as our own numeric user id, so
/// revenuecat_webhook.php's app_user_id maps straight back to users.id.
///
/// Setup required before this actually works:
///  1. Create a RevenueCat project, link the iOS/Android app service listings.
///  2. Create IAP products named exactly as each category_subscription
///     rate_cards.plan_key (e.g. "category_monthly") in App Service Connect and
///     Google Play Console, and add them to a RevenueCat offering.
///  3. Replace revenueCatApiKeyIOS/Android below with the project's public
///     SDK keys (Project settings > API keys in the RevenueCat dashboard).
class PurchaseService {
  static const _apiKeyIOS = 'REPLACE_ME';
  static const _apiKeyAndroid = 'REPLACE_ME';

  /// The entitlement identifier configured in the RevenueCat dashboard,
  /// attached to every category_subscription product — must match
  /// REVENUECAT_ENTITLEMENT_ID in backend/config/revenuecat.php exactly.
  static const entitlementId = 'category_ad_subscription';

  static bool _configured = false;

  /// Configures the SDK (once per app run) and identifies this subscriber
  /// as [userId] — call right after a category_manager/category_staff login
  /// succeeds, before offering a purchase.
  static Future<void> logIn(int userId) async {
    if (!_configured) {
      final apiKey = !kIsWeb && Platform.isAndroid ? _apiKeyAndroid : _apiKeyIOS;
      await Purchases.configure(PurchasesConfiguration(apiKey));
      _configured = true;
    }
    await Purchases.logIn('$userId');
  }

  static Future<CustomerInfo> getCustomerInfo() => Purchases.getCustomerInfo();
}
