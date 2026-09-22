import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/analytics/analytics_service.dart';
import '../../core/api/category_ad_service.dart';
import '../../core/api/category_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/category.dart';
import '../../models/promo_banner.dart';
import '../services/service_detail_screen.dart';

class CategoryDetailScreen extends StatefulWidget {
  final int categoryId;
  final String area;

  const CategoryDetailScreen({super.key, required this.categoryId, required this.area});

  @override
  State<CategoryDetailScreen> createState() => _CategoryDetailScreenState();
}

class _CategoryDetailScreenState extends State<CategoryDetailScreen> {
  final _categoryService = CategoryService();
  final _categoryAdService = CategoryAdService();
  Category? _category;
  List<PromoBanner> _adBanners = [];

  @override
  void initState() {
    super.initState();
    _categoryService.get(widget.categoryId, area: widget.area).then((m) {
      setState(() => _category = m);
      AnalyticsService.trackCategoryView(widget.categoryId, area: widget.area);
    });
    _categoryAdService.list(widget.categoryId).then(
          (ads) => setState(
            () => _adBanners =
                ads.map((a) => PromoBanner(id: a.id, imageUrl: a.imageUrl, linkUrl: a.linkUrl)).toList(),
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final category = _category;
    if (category == null) {
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
            actions: [GradientAppBar.pageNameLabel(category.name)],
            flexibleSpace: FlexibleSpaceBar(
              background: category.logoUrl == null
                  ? Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [scheme.primary, scheme.tertiary]),
                      ),
                    )
                  : CachedNetworkImage(imageUrl: category.logoUrl!, fit: BoxFit.cover),
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
                  if (category.address != null) Text(category.address!),
                  if (category.description != null) ...[
                    const SizedBox(height: 8),
                    Text(category.description!),
                  ],
                  const Divider(height: 32),
                  Text('${category.name} in ${widget.area}', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
            ),
          ),
          if (category.services.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No services listed for this category yet')),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
              sliver: SliverList.separated(
                itemCount: category.services.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final service = category.services[index];
                  return Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(12),
                      leading: CircleAvatar(
                        radius: 26,
                        backgroundImage: service.logoUrl == null
                            ? null
                            : CachedNetworkImageProvider(service.logoUrl!),
                        child: service.logoUrl == null ? const Icon(Icons.storefront) : null,
                      ),
                      title: Text(service.name),
                      subtitle: Text(service.tagName ?? ''),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ServiceDetailScreen(serviceId: service.id)),
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
