import 'api_client.dart';

class MallSubscriptionService {
  final ApiClient _client = ApiClient();

  /// Confirms a just-completed RevenueCat purchase with the backend, which
  /// independently re-verifies it against RevenueCat's own API (deriving
  /// its own transaction id from that response — see revenuecat_sync.php)
  /// before extending the mall's subscription. Safe to call even if the
  /// webhook already fulfilled it (idempotent server-side); [planKey] is
  /// just a sanity check that the confirmed purchase matches what was
  /// tapped.
  Future<void> syncPurchase({required String planKey}) =>
      _client.post('/payments/revenuecat_sync.php', {'plan_key': planKey});
}
