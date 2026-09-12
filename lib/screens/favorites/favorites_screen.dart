import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/gradient_app_bar.dart';
import '../../core/widgets/offer_card.dart';
import '../../providers/favorites_provider.dart';
import '../offers/offer_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<FavoritesProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final favoritesProvider = context.watch<FavoritesProvider>();

    return Scaffold(
      appBar: const GradientAppBar(pageName: 'Saved Offers'),
      body: RefreshIndicator(
        onRefresh: favoritesProvider.load,
        child: favoritesProvider.loading
            ? const Center(child: CircularProgressIndicator())
            : favoritesProvider.offers.isEmpty
                ? LayoutBuilder(
                    builder: (context, constraints) => SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: SizedBox(
                        height: constraints.maxHeight,
                        child: const Center(child: Text('No saved offers yet')),
                      ),
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 0.68,
                    ),
                    itemCount: favoritesProvider.offers.length,
                    itemBuilder: (context, index) {
                      final offer = favoritesProvider.offers[index];
                      return OfferCard(
                        offer: offer,
                        isFavorite: true,
                        onFavoriteToggle: () => favoritesProvider.toggle(offer.id),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => OfferDetailScreen(offerId: offer.id)),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
