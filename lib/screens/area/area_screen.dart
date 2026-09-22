import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/banner_service.dart';
import '../../core/api/category_service.dart';
import '../../core/api/service_api.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/category.dart';
import '../../models/promo_banner.dart';
import '../../models/service.dart';
import '../services/service_detail_screen.dart';
import 'category_detail_screen.dart';

class AreaScreen extends StatefulWidget {
  final String area;

  const AreaScreen({super.key, required this.area});

  @override
  State<AreaScreen> createState() => _AreaScreenState();
}

class _AreaScreenState extends State<AreaScreen> with WidgetsBindingObserver {
  final _bannerService = BannerService();
  final _categoryService = CategoryService();
  final _serviceApi = ServiceApi();

  List<PromoBanner> _banners = [];
  List<Category> _categories = [];
  List<Service> _services = [];
  bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  // `_loading` only gates the initial full-screen spinner. Later calls (pull
  // to refresh, or auto-refresh on app resume) leave it false so the current
  // content and scroll position stay put while data updates quietly.
  Future<void> _load() async {
    final results = await Future.wait([
      _bannerService.list(),
      // Categories (Store/Services/Health/...) are global sections shown in
      // every area, not scoped to one — unlike services, which are filtered
      // to this area below.
      _categoryService.list(),
      _serviceApi.list(area: widget.area),
    ]);
    if (!mounted) return;
    setState(() {
      _banners = results[0] as List<PromoBanner>;
      _categories = results[1] as List<Category>;
      _services = results[2] as List<Service>;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = _query.trim().toLowerCase();
    final categories = query.isEmpty
        ? _categories
        : _categories.where((m) => m.name.toLowerCase().contains(query)).toList();
    final services = query.isEmpty
        ? _services
        : _services.where((s) => s.name.toLowerCase().contains(query)).toList();

    return Scaffold(
      appBar: GradientAppBar(pageName: widget.area),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                children: [
                  if (_banners.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: BannerCarousel(banners: _banners),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: TextField(
                      decoration: const InputDecoration(
                        hintText: 'Search categories, services...',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (v) => setState(() => _query = v),
                    ),
                  ),
                  if (categories.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
                      child: Text('Categories', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    ...categories.map(
                      (category) => ListTile(
                        leading: CircleAvatar(
                          backgroundImage:
                              category.logoUrl == null ? null : CachedNetworkImageProvider(category.logoUrl!),
                          child: category.logoUrl == null ? const Icon(Icons.apartment) : null,
                        ),
                        title: Text(category.name),
                        subtitle: category.address == null ? null : Text(category.address!),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CategoryDetailScreen(categoryId: category.id, area: widget.area),
                          ),
                        ),
                      ),
                    ),
                  ],
                  if (services.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text('Services', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    ...services.map(
                      (service) => ListTile(
                        leading: CircleAvatar(
                          backgroundImage: service.logoUrl == null
                              ? null
                              : CachedNetworkImageProvider(service.logoUrl!),
                          child: service.logoUrl == null ? const Icon(Icons.storefront) : null,
                        ),
                        title: Text(service.name),
                        subtitle: Text(service.tagName ?? service.address ?? ''),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => ServiceDetailScreen(serviceId: service.id)),
                        ),
                      ),
                    ),
                  ],
                  if (categories.isEmpty && services.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child: Center(child: Text('Nothing found in this area yet')),
                    ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
    );
  }
}
