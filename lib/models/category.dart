import 'service.dart';
import 'unit.dart';

class Category {
  final int id;
  final String name;
  final String? description;
  final String? address;
  final String? area;
  final String? emailDomain;
  final String? logoUrl;
  final String status;
  final String? reviewNote;
  final int? lastEditedBy;
  final DateTime? subscriptionExpiresAt;
  final List<Service> services;
  final List<Unit> units;

  const Category({
    required this.id,
    required this.name,
    this.description,
    this.address,
    this.area,
    this.emailDomain,
    this.logoUrl,
    this.status = 'approved',
    this.reviewNote,
    this.lastEditedBy,
    this.subscriptionExpiresAt,
    this.services = const [],
    this.units = const [],
  });

  bool get hasActiveAdSubscription =>
      subscriptionExpiresAt != null && subscriptionExpiresAt!.isAfter(DateTime.now());

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
        description: json['description'] as String?,
        address: json['address'] as String?,
        area: json['area'] as String?,
        emailDomain: json['email_domain'] as String?,
        logoUrl: json['logo_url'] as String?,
        status: json['status'] as String? ?? 'approved',
        reviewNote: json['review_note'] as String?,
        lastEditedBy: json['last_edited_by'] == null ? null : int.tryParse(json['last_edited_by'].toString()),
        subscriptionExpiresAt: json['subscription_expires_at'] == null
            ? null
            : DateTime.parse(json['subscription_expires_at'] as String),
        units: (json['units'] as List?)?.map((e) => Unit.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
        services: (json['services'] as List?)
                ?.map((e) => Service.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}
