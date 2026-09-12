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
  final int? categoryId;
  final String? categoryName;
  final String? mallName;
  final String? city;
  final int? ownerId;
  final int? lastEditedBy;
  final String? reviewNote;

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
    this.categoryId,
    this.categoryName,
    this.mallName,
    this.city,
    this.ownerId,
    this.lastEditedBy,
    this.reviewNote,
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
        categoryId: json['category_id'] == null ? null : int.tryParse(json['category_id'].toString()),
        categoryName: json['category_name'] as String?,
        mallName: json['mall_name'] as String?,
        city: json['city'] as String?,
        ownerId: json['owner_id'] == null ? null : int.tryParse(json['owner_id'].toString()),
        lastEditedBy: json['last_edited_by'] == null ? null : int.tryParse(json['last_edited_by'].toString()),
        reviewNote: json['review_note'] as String?,
      );
}

double? _toDouble(dynamic value) {
  if (value == null) return null;
  return double.tryParse(value.toString());
}
