class Area {
  final int id;
  final String name;

  const Area({required this.id, required this.name});

  factory Area.fromJson(Map<String, dynamic> json) => Area(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
      );
}
