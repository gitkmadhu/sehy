import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/banner_service.dart';
import '../../core/api/mall_service.dart';
import '../../core/api/store_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/mall.dart';
import '../../models/promo_banner.dart';
import '../../models/store.dart';
import '../stores/store_detail_screen.dart';
import 'mall_detail_screen.dart';

class CityScreen extends StatefulWidget {
  final String city;

  const CityScreen({super.key, required this.city});

  @override
  State<CityScreen> createState() => _CityScreenState();
}

class _CityScreenState extends State<CityScreen> with WidgetsBindingObserver {
  final _bannerService = BannerService();
  final _mallService = MallService();
  final _storeService = StoreService();

  List<PromoBanner> _banners = [];
  List<Mall> _malls = [];
  List<Store> _stores = [];
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
      _mallService.list(city: widget.city),
      _storeService.list(city: widget.city),
    ]);
    if (!mounted) return;
    setState(() {
      _banners = results[0] as List<PromoBanner>;
      _malls = results[1] as List<Mall>;
      _stores = results[2] as List<Store>;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = _query.trim().toLowerCase();
    final malls = query.isEmpty
        ? _malls
        : _malls.where((m) => m.name.toLowerCase().contains(query)).toList();
    final stores = query.isEmpty
        ? _stores
        : _stores.where((s) => s.name.toLowerCase().contains(query)).toList();

    return Scaffold(
      appBar: GradientAppBar(pageName: widget.city),
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
                        hintText: 'Search malls, stores...',
                        prefixIcon: Icon(Icons.search),
                      ),
                      onChanged: (v) => setState(() => _query = v),
                    ),
                  ),
                  if (malls.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
                      child: Text('Malls', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    ...malls.map(
                      (mall) => ListTile(
                        leading: CircleAvatar(
                          backgroundImage:
                              mall.logoUrl == null ? null : CachedNetworkImageProvider(mall.logoUrl!),
                          child: mall.logoUrl == null ? const Icon(Icons.apartment) : null,
                        ),
                        title: Text(mall.name),
                        subtitle: mall.address == null ? null : Text(mall.address!),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => MallDetailScreen(mallId: mall.id)),
                        ),
                      ),
                    ),
                  ],
                  if (stores.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text('Stores', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    ...stores.map(
                      (store) => ListTile(
                        leading: CircleAvatar(
                          backgroundImage: store.logoUrl == null
                              ? null
                              : CachedNetworkImageProvider(store.logoUrl!),
                          child: store.logoUrl == null ? const Icon(Icons.storefront) : null,
                        ),
                        title: Text(store.name),
                        subtitle: Text(store.categoryName ?? store.address ?? ''),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => StoreDetailScreen(storeId: store.id)),
                        ),
                      ),
                    ),
                  ],
                  if (malls.isEmpty && stores.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child: Center(child: Text('Nothing found in this city yet')),
                    ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
    );
  }
}
