import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

import '../../core/analytics/analytics_service.dart';
import '../../core/api/offer_service.dart';
import '../../core/api/store_ad_service.dart';
import '../../core/api/store_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../core/widgets/offer_card.dart';
import '../../models/offer.dart';
import '../../models/promo_banner.dart';
import '../../models/store.dart';
import '../../providers/favorites_provider.dart';
import 'package:provider/provider.dart';

import '../offers/offer_detail_screen.dart';

class StoreDetailScreen extends StatefulWidget {
  final int storeId;

  const StoreDetailScreen({super.key, required this.storeId});

  @override
  State<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends State<StoreDetailScreen> {
  final _storeService = StoreService();
  final _offerService = OfferService();
  final _storeAdService = StoreAdService();
  Store? _store;
  List<Offer> _offers = [];
  List<PromoBanner> _adBanners = [];

  @override
  void initState() {
    super.initState();
    AnalyticsService.trackStoreView(widget.storeId);
    _storeService.get(widget.storeId).then((s) => setState(() => _store = s));
    _offerService.list(storeId: widget.storeId).then((o) => setState(() => _offers = o));
    _storeAdService.list(widget.storeId).then(
          (ads) => setState(
            () => _adBanners =
                ads.map((a) => PromoBanner(id: a.id, imageUrl: a.imageUrl, linkUrl: a.linkUrl)).toList(),
          ),
        );
  }

  Future<void> _launch(String url) =>
      url_launcher.launchUrl(Uri.parse(url), mode: url_launcher.LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context) {
    final store = _store;
    if (store == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final favoritesProvider = context.watch<FavoritesProvider>();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: scheme.primary,
            iconTheme: const IconThemeData(color: Colors.white),
            title: GradientAppBar.brandTitle,
            actions: [GradientAppBar.pageNameLabel(store.name)],
            flexibleSpace: FlexibleSpaceBar(
              background: store.coverUrl == null
                  ? Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [scheme.primary, scheme.tertiary]),
                      ),
                    )
                  : CachedNetworkImage(imageUrl: store.coverUrl!, fit: BoxFit.cover),
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
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundImage:
                            store.logoUrl == null ? null : CachedNetworkImageProvider(store.logoUrl!),
                        child: store.logoUrl == null ? const Icon(Icons.storefront) : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(store.name, style: Theme.of(context).textTheme.headlineSmall),
                            if (store.categoryName != null)
                              Text(store.categoryName!, style: Theme.of(context).textTheme.bodyMedium),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (store.description != null) ...[
                    const SizedBox(height: 16),
                    Text(store.description!),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (store.phone != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch('tel:${store.phone}'),
                          icon: const Icon(Icons.call_outlined),
                          label: const Text('Call'),
                        ),
                      if (store.whatsapp != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch('https://wa.me/${store.whatsapp}'),
                          icon: const Icon(Icons.chat_outlined),
                          label: const Text('WhatsApp'),
                        ),
                      if (store.website != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch(store.website!),
                          icon: const Icon(Icons.language_outlined),
                          label: const Text('Website'),
                        ),
                      if (store.latitude != null && store.longitude != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch(
                            'https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}',
                          ),
                          icon: const Icon(Icons.map_outlined),
                          label: const Text('Directions'),
                        ),
                    ],
                  ),
                  const Divider(height: 32),
                  Text('Current offers', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
            ),
          ),
          if (_offers.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No active offers from this store yet')),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 0.68,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final offer = _offers[index];
                    return OfferCard(
                      offer: offer,
                      isFavorite: favoritesProvider.isFavorite(offer.id),
                      onFavoriteToggle: () => favoritesProvider.toggle(offer.id),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => OfferDetailScreen(offerId: offer.id)),
                      ),
                    );
                  },
                  childCount: _offers.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
