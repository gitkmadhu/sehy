class Tag {
  final int id;
  final String name;
  final String? icon;

  const Tag({required this.id, required this.name, this.icon});

  factory Tag.fromJson(Map<String, dynamic> json) => Tag(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
        icon: json['icon'] as String?,
      );
}
