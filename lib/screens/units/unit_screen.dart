import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/unit_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/unit.dart';
import '../services/service_detail_screen.dart';

/// A unit (e.g. Troop Bazar) and the shops listed inside it.
class UnitScreen extends StatefulWidget {
  final int unitId;

  const UnitScreen({super.key, required this.unitId});

  @override
  State<UnitScreen> createState() => _UnitScreenState();
}

class _UnitScreenState extends State<UnitScreen> {
  final _unitService = UnitService();
  Unit? _unit;
  String? _error;

  @override
  void initState() {
    super.initState();
    _unitService.get(widget.unitId).then((u) {
      if (mounted) setState(() => _unit = u);
    }).catchError((e) {
      if (mounted) setState(() => _error = e.toString());
    });
  }

  @override
  Widget build(BuildContext context) {
    final unit = _unit;
    if (_error != null) {
      return Scaffold(appBar: const GradientAppBar(pageName: 'Unit'), body: Center(child: Text(_error!)));
    }
    if (unit == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: GradientAppBar(pageName: unit.name),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (unit.categoryName != null)
            Text(unit.categoryName!, style: Theme.of(context).textTheme.bodySmall),
          if (unit.description != null) ...[
            const SizedBox(height: 8),
            Text(unit.description!),
          ],
          const SizedBox(height: 12),
          Text('${unit.services.length} ${unit.services.length == 1 ? 'shop' : 'shops'}',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (unit.services.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('No shops listed here yet')),
            ),
          for (final service in unit.services)
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundImage: service.logoUrl == null ? null : CachedNetworkImageProvider(service.logoUrl!),
                  child: service.logoUrl == null ? const Icon(Icons.storefront) : null,
                ),
                title: Text(service.name),
                subtitle: Text(service.tagName ?? service.address ?? service.area ?? ''),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ServiceDetailScreen(serviceId: service.id)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
