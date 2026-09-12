class City {
  final int id;
  final String name;

  const City({required this.id, required this.name});

  factory City.fromJson(Map<String, dynamic> json) => City(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
      );
}
