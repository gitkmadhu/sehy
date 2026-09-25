import 'service.dart';

/// The level between a category and its services (e.g. Wholesale > Troop
/// Bazar > Shop1, Shop2, Shop3).
class Unit {
  final int id;
  final int? categoryId;
  final String name;
  final String? description;
  final String? logoUrl;
  final String? categoryName;
  final int serviceCount;
  final List<Service> services;

  const Unit({
    required this.id,
    required this.name,
    this.categoryId,
    this.description,
    this.logoUrl,
    this.categoryName,
    this.serviceCount = 0,
    this.services = const [],
  });

  factory Unit.fromJson(Map<String, dynamic> json) => Unit(
        id: int.parse(json['id'].toString()),
        name: json['name'] as String,
        categoryId: json['category_id'] == null ? null : int.tryParse(json['category_id'].toString()),
        description: json['description'] as String?,
        logoUrl: json['logo_url'] as String?,
        categoryName: json['category_name'] as String?,
        serviceCount: int.tryParse('${json['service_count'] ?? 0}') ?? 0,
        services: (json['services'] as List?)
                ?.map((e) => Service.fromJson({'status': 'approved', ...(e as Map<String, dynamic>)}))
                .toList() ??
            const [],
      );
}
