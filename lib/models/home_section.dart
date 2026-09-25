import 'service.dart';
import 'unit.dart';

/// One home page section per category: its units, plus any approved services
/// in the category that aren't in a unit yet.
class HomeSection {
  final int categoryId;
  final String title;
  final List<Unit> units;
  final List<Service> services;

  const HomeSection({
    required this.categoryId,
    required this.title,
    this.units = const [],
    this.services = const [],
  });

  factory HomeSection.fromJson(Map<String, dynamic> json) => HomeSection(
        categoryId: int.parse(json['id'].toString()),
        title: json['name'] as String,
        units: (json['units'] as List?)?.map((e) => Unit.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
        services: (json['services'] as List?)
                ?.map((e) => Service.fromJson({'status': 'approved', ...(e as Map<String, dynamic>)}))
                .toList() ??
            const [],
      );
}
