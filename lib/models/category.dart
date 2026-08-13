class Category {
  final int id;
  final String name;
  final String? icon;

  const Category({required this.id, required this.name, this.icon});

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
        icon: json['icon'] as String?,
      );
}
