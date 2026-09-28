import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/analytics/analytics_service.dart';
import '../../core/api/category_ad_service.dart';
import '../../core/api/category_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/category.dart';
import '../../models/promo_banner.dart';
import '../units/unit_screen.dart';

/// A category's own page — mirrors category.html on the website: just the
/// hero banner and the list of units (markets), nothing else.
class CategoryDetailScreen extends StatefulWidget {
  final int categoryId;
  final String? area;

  const CategoryDetailScreen({super.key, required this.categoryId, this.area});

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
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('Markets', style: Theme.of(context).textTheme.titleMedium),
            ),
          ),
          if (category.units.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No markets listed for this category yet')),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
              sliver: SliverList.separated(
                itemCount: category.units.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final unit = category.units[index];
                  return Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(12),
                      leading: CircleAvatar(
                        radius: 26,
                        backgroundColor: scheme.surfaceContainerHighest,
                        backgroundImage:
                            unit.logoUrl == null ? null : CachedNetworkImageProvider(unit.logoUrl!),
                        child: unit.logoUrl == null ? const Icon(Icons.apartment) : null,
                      ),
                      title: Text(unit.name),
                      subtitle: Text('${unit.serviceCount} ${unit.serviceCount == 1 ? 'shop' : 'shops'}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => UnitScreen(unitId: unit.id)),
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
