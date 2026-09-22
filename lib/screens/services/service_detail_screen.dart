import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

import '../../core/analytics/analytics_service.dart';
import '../../core/api/offer_service.dart';
import '../../core/api/service_ad_service.dart';
import '../../core/api/service_api.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../core/widgets/offer_card.dart';
import '../../models/offer.dart';
import '../../models/promo_banner.dart';
import '../../models/service.dart';
import '../../providers/favorites_provider.dart';
import 'package:provider/provider.dart';

import '../offers/offer_detail_screen.dart';

class ServiceDetailScreen extends StatefulWidget {
  final int serviceId;

  const ServiceDetailScreen({super.key, required this.serviceId});

  @override
  State<ServiceDetailScreen> createState() => _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends State<ServiceDetailScreen> {
  final _serviceApi = ServiceApi();
  final _offerService = OfferService();
  final _serviceAdService = ServiceAdService();
  Service? _service;
  List<Offer> _offers = [];
  List<PromoBanner> _adBanners = [];

  @override
  void initState() {
    super.initState();
    _serviceApi.get(widget.serviceId).then((s) {
      setState(() => _service = s);
      AnalyticsService.trackServiceView(widget.serviceId, area: s.area);
    });
    _offerService.list(serviceId: widget.serviceId).then((o) => setState(() => _offers = o));
    _serviceAdService.list(widget.serviceId).then(
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
    final service = _service;
    if (service == null) {
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
            actions: [GradientAppBar.pageNameLabel(service.name)],
            flexibleSpace: FlexibleSpaceBar(
              background: service.coverUrl == null
                  ? Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [scheme.primary, scheme.tertiary]),
                      ),
                    )
                  : CachedNetworkImage(imageUrl: service.coverUrl!, fit: BoxFit.cover),
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
                            service.logoUrl == null ? null : CachedNetworkImageProvider(service.logoUrl!),
                        child: service.logoUrl == null ? const Icon(Icons.storefront) : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(service.name, style: Theme.of(context).textTheme.headlineSmall),
                            if (service.tagName != null)
                              Text(service.tagName!, style: Theme.of(context).textTheme.bodyMedium),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (service.description != null) ...[
                    const SizedBox(height: 16),
                    Text(service.description!),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (service.phone != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch('tel:${service.phone}'),
                          icon: const Icon(Icons.call_outlined),
                          label: const Text('Call'),
                        ),
                      if (service.whatsapp != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch('https://wa.me/${service.whatsapp}'),
                          icon: const Icon(Icons.chat_outlined),
                          label: const Text('WhatsApp'),
                        ),
                      if (service.website != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch(service.website!),
                          icon: const Icon(Icons.language_outlined),
                          label: const Text('Website'),
                        ),
                      if (service.latitude != null && service.longitude != null)
                        OutlinedButton.icon(
                          onPressed: () => _launch(
                            'https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}',
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
                child: Center(child: Text('No active offers from this service yet')),
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
