double? _toDouble(dynamic value) {
  if (value == null) return null;
  return double.tryParse(value.toString());
}

class Offer {
  final int id;
  final int serviceId;
  final String title;
  final String? description;
  final String? imageUrl;
  final double? originalPrice;
  final double? discountedPrice;
  final int? discountPercent;
  final DateTime expiresAt;
  final String status;
  final String serviceName;
  final String? serviceLogoUrl;
  final double? serviceLatitude;
  final double? serviceLongitude;
  final String? tagName;
  final int? submittedBy;

  const Offer({
    required this.id,
    required this.serviceId,
    required this.title,
    required this.expiresAt,
    required this.status,
    required this.serviceName,
    this.description,
    this.imageUrl,
    this.originalPrice,
    this.discountedPrice,
    this.discountPercent,
    this.serviceLogoUrl,
    this.serviceLatitude,
    this.serviceLongitude,
    this.tagName,
    this.submittedBy,
  });

  bool get isExpired => expiresAt.isBefore(DateTime.now());

  factory Offer.fromJson(Map<String, dynamic> json) => Offer(
        id: int.parse(json['id'].toString()),
        serviceId: int.parse(json['service_id'].toString()),
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
        serviceName: json['service_name'] as String? ?? '',
        serviceLogoUrl: json['service_logo_url'] as String?,
        serviceLatitude: _toDouble(json['service_latitude']),
        serviceLongitude: _toDouble(json['service_longitude']),
        tagName: json['tag_name'] as String?,
        submittedBy: json['submitted_by'] == null ? null : int.tryParse(json['submitted_by'].toString()),
      );
}
