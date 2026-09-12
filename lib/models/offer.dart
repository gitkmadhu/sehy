double? _toDouble(dynamic value) {
  if (value == null) return null;
  return double.tryParse(value.toString());
}

class Offer {
  final int id;
  final int storeId;
  final String title;
  final String? description;
  final String? imageUrl;
  final double? originalPrice;
  final double? discountedPrice;
  final int? discountPercent;
  final DateTime expiresAt;
  final String status;
  final String storeName;
  final String? storeLogoUrl;
  final double? storeLatitude;
  final double? storeLongitude;
  final String? categoryName;
  final int? submittedBy;

  const Offer({
    required this.id,
    required this.storeId,
    required this.title,
    required this.expiresAt,
    required this.status,
    required this.storeName,
    this.description,
    this.imageUrl,
    this.originalPrice,
    this.discountedPrice,
    this.discountPercent,
    this.storeLogoUrl,
    this.storeLatitude,
    this.storeLongitude,
    this.categoryName,
    this.submittedBy,
  });

  bool get isExpired => expiresAt.isBefore(DateTime.now());

  factory Offer.fromJson(Map<String, dynamic> json) => Offer(
        id: int.parse(json['id'].toString()),
        storeId: int.parse(json['store_id'].toString()),
        title: json['title'] as String,
        description: json['description'] as String?,
        imageUrl: json['image_url'] as String?,
        originalPrice: _toDouble(json['original_price']),
        discountedPrice: _toDouble(json['discounted_price']),
        discountPercent: json['discount_percent'] == null
            ? null
            : int.tryParse(json['discount_percent'].toString()),
        expiresAt: DateTime.parse(json['expires_at'] as String),
        status: json['status'] as String? ?? 'pending',
        storeName: json['store_name'] as String? ?? '',
        storeLogoUrl: json['store_logo_url'] as String?,
        storeLatitude: _toDouble(json['store_latitude']),
        storeLongitude: _toDouble(json['store_longitude']),
        categoryName: json['category_name'] as String?,
        submittedBy: json['submitted_by'] == null ? null : int.tryParse(json['submitted_by'].toString()),
      );
}
