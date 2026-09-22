import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/banner_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../core/widgets/offer_card.dart';
import '../../models/promo_banner.dart';
import '../../providers/favorites_provider.dart';
import '../../providers/offers_provider.dart';
import 'offer_detail_screen.dart';

class OffersListScreen extends StatefulWidget {
  const OffersListScreen({super.key});

  @override
  State<OffersListScreen> createState() => _OffersListScreenState();
}

class _OffersListScreenState extends State<OffersListScreen> {
  final _bannerService = BannerService();
  List<PromoBanner> _banners = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OffersProvider>().load();
      context.read<FavoritesProvider>().load();
    });
    _bannerService.list().then((b) => setState(() => _banners = b));
  }

  @override
  Widget build(BuildContext context) {
    final offersProvider = context.watch<OffersProvider>();
    final favoritesProvider = context.watch<FavoritesProvider>();

    return Scaffold(
      appBar: const GradientAppBar(pageName: 'Nearby Offers'),
      body: RefreshIndicator(
        onRefresh: offersProvider.load,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search offers, services...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onSubmitted: offersProvider.search,
                ),
              ),
            ),
            if (_banners.isNotEmpty)
              SliverToBoxAdapter(child: BannerCarousel(banners: _banners)),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            if (offersProvider.loading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (offersProvider.error != null)
              SliverFillRemaining(child: Center(child: Text(offersProvider.error!)))
            else if (offersProvider.offers.isEmpty)
              const SliverFillRemaining(child: Center(child: Text('No offers right now')))
            else
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.68,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final offer = offersProvider.offers[index];
                      return OfferCard(
                        offer: offer,
                        isFavorite: favoritesProvider.isFavorite(offer.id),
                        onFavoriteToggle: () => favoritesProvider.toggle(offer.id),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => OfferDetailScreen(offerId: offer.id)),
                        ),
                      );
                    },
                    childCount: offersProvider.offers.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
