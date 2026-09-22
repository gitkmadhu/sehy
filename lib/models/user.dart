class AppUser {
  final int id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String? avatarUrl;
  final int? categoryId;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.avatarUrl,
    this.categoryId,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
        phone: json['phone'] as String?,
        avatarUrl: json['avatar_url'] as String?,
        categoryId: json['category_id'] == null ? null : int.tryParse(json['category_id'].toString()),
      );
}
