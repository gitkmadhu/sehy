import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

import '../../core/api/offer_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/offer.dart';
import '../../providers/favorites_provider.dart';

class OfferDetailScreen extends StatefulWidget {
  final int offerId;

  const OfferDetailScreen({super.key, required this.offerId});

  @override
  State<OfferDetailScreen> createState() => _OfferDetailScreenState();
}

class _OfferDetailScreenState extends State<OfferDetailScreen> {
  final _offerService = OfferService();
  Offer? _offer;
  String? _error;

  @override
  void initState() {
    super.initState();
    _offerService.get(widget.offerId).then(
      (offer) => setState(() => _offer = offer),
      onError: (e) => setState(() => _error = e.toString()),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: const GradientAppBar(pageName: 'Offer'),
        body: Center(child: Text(_error!)),
      );
    }
    if (_offer == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final offer = _offer!;
    final favoritesProvider = context.watch<FavoritesProvider>();
    final isFavorite = favoritesProvider.isFavorite(offer.id);
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 260,
            pinned: true,
            backgroundColor: scheme.primary,
            iconTheme: const IconThemeData(color: Colors.white),
            actionsIconTheme: const IconThemeData(color: Colors.white),
            title: GradientAppBar.brandTitle,
            actions: [
              GradientAppBar.pageNameLabel(offer.title),
              IconButton(
                icon: Icon(isFavorite ? Icons.favorite : Icons.favorite_border),
                onPressed: () => favoritesProvider.toggle(offer.id),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: offer.imageUrl == null
                  ? Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [scheme.primary, scheme.tertiary]),
                      ),
                    )
                  : CachedNetworkImage(imageUrl: offer.imageUrl!, fit: BoxFit.cover),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(offer.serviceName, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(offer.title, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (offer.discountedPrice != null) ...[
                        Text(
                          NumberFormat.simpleCurrency().format(offer.discountedPrice),
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(color: Theme.of(context).colorScheme.primary),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (offer.originalPrice != null)
                        Text(
                          NumberFormat.simpleCurrency().format(offer.originalPrice),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                decoration: TextDecoration.lineThrough,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Expires ${DateFormat.yMMMd().format(offer.expiresAt)}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const Divider(height: 32),
                  if (offer.description != null) ...[
                    Text('Details', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text(offer.description!),
                    const SizedBox(height: 24),
                  ],
                  if (offer.serviceLatitude != null && offer.serviceLongitude != null)
                    OutlinedButton.icon(
                      onPressed: () => url_launcher.launchUrl(
                        Uri.parse(
                          'https://www.google.com/maps/search/?api=1&query=${offer.serviceLatitude},${offer.serviceLongitude}',
                        ),
                        mode: url_launcher.LaunchMode.externalApplication,
                      ),
                      icon: const Icon(Icons.map_outlined),
                      label: const Text('View service on map'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
