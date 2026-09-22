import '../../models/user_notification.dart';
import 'api_client.dart';

class NotificationService {
  final ApiClient _client = ApiClient();

  Future<List<UserNotification>> list() async {
    final data = await _client.get('/user_notifications/list.php');
    return (data['notifications'] as List)
        .map((e) => UserNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<int> unreadCount() async {
    final data = await _client.get('/user_notifications/unread_count.php');
    return int.parse(data['count'].toString());
  }

  Future<void> markRead(int id) => _client.post('/user_notifications/mark_read.php', {'id': id});

  Future<void> delete(int id) => _client.delete('/user_notifications/delete.php', {'id': id});

  /// Sends [message] to Sehy admin (category_manager/service_owner only) — the
  /// reply comes back as a normal notification in this user's own list.
  Future<void> messageAdmin(String message) =>
      _client.post('/user_notifications/message_admin.php', {'message': message});
}
