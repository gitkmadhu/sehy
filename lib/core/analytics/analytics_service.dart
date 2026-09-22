import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';

/// Screen-view analytics for the mobile app — the counterpart to
/// `website/js/analytics.js`'s gtag.js tracking. Fires the *same* event
/// names and parameter keys (`category_view`/`category_id`, `service_view`/`service_id`,
/// plus `area` on both) so both platforms report into the same GA4
/// property under the same custom dimensions (see
/// backend/config/analytics.php's setup steps) —
/// the admin Analytics tab's reports don't need to know which platform a
/// view came from.
///
/// Setup required before this actually sends anything (same one-time
/// per-project work as PushService — see lib/core/push/push_service.dart):
///  1. Create a Firebase project and add the iOS/Android apps to it.
///  2. Run `flutterfire configure` in this project to generate
///     firebase_options.dart (or otherwise drop in google-services.json /
///     GoogleService-Info.plist and apply the platform Gradle/Pod setup).
///  3. Link that Firebase project's Analytics to the same GA4 property
///     used by backend/config/analytics.php, if it isn't already the one
///     Firebase created for you.
/// Until that's done, [initialize] fails silently (caught below) and every
/// track call below just no-ops — never a crash, same "not connected yet"
/// tolerance as every other analytics/payment integration in this project.
class AnalyticsService {
  static bool _ready = false;

  static Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
      _ready = true;
    } catch (_) {
      _ready = false;
    }
  }

  static void trackCategoryView(int categoryId, {String? area}) {
    if (!_ready) return;
    FirebaseAnalytics.instance.logEvent(
      name: 'category_view',
      parameters: {
        'category_id': categoryId.toString(),
        if (area != null) 'area': area,
      },
    );
  }

  static void trackServiceView(int serviceId, {int? categoryId, String? area}) {
    if (!_ready) return;
    FirebaseAnalytics.instance.logEvent(
      name: 'service_view',
      parameters: {
        'service_id': serviceId.toString(),
        if (categoryId != null) 'category_id': categoryId.toString(),
        if (area != null) 'area': area,
      },
    );
  }
}
