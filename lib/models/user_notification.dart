/// An entry in the signed-in user's in-app notification inbox — see
/// sehy_api/endpoints/user_notifications/list.php. [data] carries whatever
/// id(s) the target screen needs to navigate on tap (e.g. categoryAdId below).
class UserNotification {
  final int id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;

  const UserNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
    this.data,
  });

  int? get categoryAdId =>
      data?['category_ad_id'] == null ? null : int.tryParse(data!['category_ad_id'].toString());

  factory UserNotification.fromJson(Map<String, dynamic> json) => UserNotification(
        id: int.parse(json['id'].toString()),
        type: json['type'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        data: json['data'] as Map<String, dynamic>?,
        isRead: json['is_read'] as bool,
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}
