import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  /// Base URL of the PHP backend's endpoint folder.
  ///
  /// - Android emulator reaches the host machine via 10.0.2.2.
  /// - iOS simulator / web / desktop reach it via localhost.
  /// - Replace with your real domain when deploying (e.g. https://yourdomain.com/gmls_api/endpoints).
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost/gmls_api/endpoints';
    if (Platform.isAndroid) return 'http://10.0.2.2/gmls_api/endpoints';
    return 'http://localhost/gmls_api/endpoints';
  }
}
