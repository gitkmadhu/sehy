import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/analytics/analytics_service.dart';
import '../../core/api/mall_ad_service.dart';
import '../../core/api/mall_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/mall.dart';
import '../../models/promo_banner.dart';
import '../stores/store_detail_screen.dart';

class MallDetailScreen extends StatefulWidget {
  final int mallId;

  const MallDetailScreen({super.key, required this.mallId});

  @override
  State<MallDetailScreen> createState() => _MallDetailScreenState();
}

class _MallDetailScreenState extends State<MallDetailScreen> {
  final _mallService = MallService();
  final _mallAdService = MallAdService();
  Mall? _mall;
  List<PromoBanner> _adBanners = [];

  @override
  void initState() {
    super.initState();
    _mallService.get(widget.mallId).then((m) {
      setState(() => _mall = m);
      AnalyticsService.trackMallView(widget.mallId, city: m.city);
    });
    _mallAdService.list(widget.mallId).then(
          (ads) => setState(
            () => _adBanners =
                ads.map((a) => PromoBanner(id: a.id, imageUrl: a.imageUrl, linkUrl: a.linkUrl)).toList(),
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final mall = _mall;
    if (mall == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            backgroundColor: scheme.primary,
            iconTheme: const IconThemeData(color: Colors.white),
            title: GradientAppBar.brandTitle,
            actions: [GradientAppBar.pageNameLabel(mall.name)],
            flexibleSpace: FlexibleSpaceBar(
              background: mall.logoUrl == null
                  ? Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [scheme.primary, scheme.tertiary]),
                      ),
                    )
                  : CachedNetworkImage(imageUrl: mall.logoUrl!, fit: BoxFit.cover),
            ),
          ),
          if (_adBanners.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: BannerCarousel(banners: _adBanners),
              ),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (mall.address != null) Text(mall.address!),
                  if (mall.description != null) ...[
                    const SizedBox(height: 8),
                    Text(mall.description!),
                  ],
                  const Divider(height: 32),
                  Text('Stores in this mall', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
            ),
          ),
          if (mall.stores.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No stores listed for this mall yet')),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
              sliver: SliverList.separated(
                itemCount: mall.stores.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final store = mall.stores[index];
                  return Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(12),
                      leading: CircleAvatar(
                        radius: 26,
                        backgroundImage: store.logoUrl == null
                            ? null
                            : CachedNetworkImageProvider(store.logoUrl!),
                        child: store.logoUrl == null ? const Icon(Icons.storefront) : null,
                      ),
                      title: Text(store.name),
                      subtitle: Text(store.categoryName ?? ''),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => StoreDetailScreen(storeId: store.id)),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
