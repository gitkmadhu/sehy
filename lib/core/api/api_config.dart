import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  /// Base URL of the PHP backend's endpoint folder.
  ///
  /// - Android reaches the host machine via `adb reverse tcp:8080 tcp:80`,
  ///   which works for both the emulator and a USB-connected physical device.
  ///   Run that command once per device connection before launching the app.
  /// - iOS simulator / web / desktop reach it via localhost.
  /// - Replace with your real domain when deploying (e.g. https://yourdomain.com/sehy_api/endpoints).
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost/sehy_api/endpoints';
    if (Platform.isAndroid) return 'http://127.0.0.1:8080/sehy_api/endpoints';
    return 'http://localhost/sehy_api/endpoints';
  }
}
