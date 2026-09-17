import 'package:flutter/foundation.dart';

import '../core/api/notification_service.dart';
import '../models/user_notification.dart';

/// Backs MallManagerHomeScreen's notification bell/badge. No push — the
/// screen calls [load] on open and on app resume (same refresh pattern
/// HomeShell/FavoritesProvider already use), so this is a plain poll.
class NotificationsProvider extends ChangeNotifier {
  final NotificationService _service = NotificationService();

  List<UserNotification> items = [];
  int unreadCount = 0;
  bool loading = false;

  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      final results = await Future.wait([_service.list(), _service.unreadCount()]);
      items = results[0] as List<UserNotification>;
      unreadCount = results[1] as int;
    } catch (_) {
      // Best-effort, same as AuthService.currentUser() — a transient
      // network failure just leaves whatever was last loaded on screen
      // instead of surfacing an uncaught error from this fire-and-forget
      // postFrameCallback call.
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> markRead(int id) async {
    await _service.markRead(id);
    final index = items.indexWhere((n) => n.id == id);
    if (index != -1 && !items[index].isRead) {
      items[index] = UserNotification(
        id: items[index].id,
        type: items[index].type,
        title: items[index].title,
        body: items[index].body,
        data: items[index].data,
        isRead: true,
        createdAt: items[index].createdAt,
      );
      unreadCount = unreadCount > 0 ? unreadCount - 1 : 0;
      notifyListeners();
    }
  }
}
