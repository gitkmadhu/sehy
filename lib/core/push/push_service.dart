import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../api/api_client.dart';

/// Registers this device for push notifications and syncs its FCM token to
/// the PHP backend (`users.fcm_token`), which `broadcast_push()` reads when
/// an admin approves a new offer.
///
/// Setup required before calling [PushService.initialize]:
///  1. Create a Firebase project and add the iOS/Android/Web apps.
///  2. Run `flutterfire configure` in this project to generate firebase_options.dart.
///  3. Copy the Cloud Messaging server key into FCM_SERVER_KEY in
///     gmls_api/lib/push.php on the backend.
class PushService {
  final ApiClient _client = ApiClient();

  Future<void> initialize() async {
    await Firebase.initializeApp();
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission();

    final token = await messaging.getToken();
    if (token != null) {
      await _client.put('/auth/me.php', {'fcm_token': token});
    }

    messaging.onTokenRefresh.listen((newToken) {
      _client.put('/auth/me.php', {'fcm_token': newToken});
    });
  }
}
