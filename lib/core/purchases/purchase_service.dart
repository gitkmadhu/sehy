import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:purchases_flutter/purchases_flutter.dart';

/// Apple Pay / Google Pay for a mall_manager's/mall_staff's ad subscription
/// — the mobile counterpart to Razorpay on the website. Configured lazily
/// (only mall_manager/mall_staff ever reach MallSubscriptionScreen, so
/// there's no reason to spin up the SDK for a shopper session) and logs the
/// RevenueCat subscriber in as our own numeric user id, so
/// revenuecat_webhook.php's app_user_id maps straight back to users.id.
///
/// Setup required before this actually works:
///  1. Create a RevenueCat project, link the iOS/Android app store listings.
///  2. Create IAP products named exactly as each mall_subscription
///     rate_cards.plan_key (e.g. "mall_monthly") in App Store Connect and
///     Google Play Console, and add them to a RevenueCat offering.
///  3. Replace revenueCatApiKeyIOS/Android below with the project's public
///     SDK keys (Project settings > API keys in the RevenueCat dashboard).
class PurchaseService {
  static const _apiKeyIOS = 'REPLACE_ME';
  static const _apiKeyAndroid = 'REPLACE_ME';

  /// The entitlement identifier configured in the RevenueCat dashboard,
  /// attached to every mall_subscription product — must match
  /// REVENUECAT_ENTITLEMENT_ID in backend/config/revenuecat.php exactly.
  static const entitlementId = 'mall_ad_subscription';

  static bool _configured = false;

  /// Configures the SDK (once per app run) and identifies this subscriber
  /// as [userId] — call right after a mall_manager/mall_staff login
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
