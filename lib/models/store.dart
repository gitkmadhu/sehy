class Store {
  final int id;
  final String name;
  final String? description;
  final String? logoUrl;
  final String? coverUrl;
  final String? address;
  final double? latitude;
  final double? longitude;
  final String? phone;
  final String? website;
  final String? whatsapp;
  final String? instagram;
  final String status;
  final String? categoryName;
  final String? mallName;

  const Store({
    required this.id,
    required this.name,
    required this.status,
    this.description,
    this.logoUrl,
    this.coverUrl,
    this.address,
    this.latitude,
    this.longitude,
    this.phone,
    this.website,
    this.whatsapp,
    this.instagram,
    this.categoryName,
    this.mallName,
  });

  factory Store.fromJson(Map<String, dynamic> json) => Store(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
        status: json['status'] as String? ?? 'pending',
        description: json['description'] as String?,
        logoUrl: json['logo_url'] as String?,
        coverUrl: json['cover_url'] as String?,
        address: json['address'] as String?,
        latitude: _toDouble(json['latitude']),
        longitude: _toDouble(json['longitude']),
        phone: json['phone'] as String?,
        website: json['website'] as String?,
        whatsapp: json['whatsapp'] as String?,
        instagram: json['instagram'] as String?,
        categoryName: json['category_name'] as String?,
        mallName: json['mall_name'] as String?,
      );
}

double? _toDouble(dynamic value) {
  if (value == null) return null;
  return double.tryParse(value.toString());
}
