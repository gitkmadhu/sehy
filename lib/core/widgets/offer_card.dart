import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/offer.dart';

class OfferCard extends StatelessWidget {
  final Offer offer;
  final bool isFavorite;
  final VoidCallback onTap;
  final VoidCallback onFavoriteToggle;

  const OfferCard({
    super.key,
    required this.offer,
    required this.isFavorite,
    required this.onTap,
    required this.onFavoriteToggle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final daysLeft = offer.expiresAt.difference(DateTime.now()).inDays;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 16 / 10,
                  child: offer.imageUrl == null
                      ? Container(color: theme.colorScheme.surfaceContainerHighest)
                      : CachedNetworkImage(
                          imageUrl: offer.imageUrl!,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) =>
                              Container(color: theme.colorScheme.surfaceContainerHighest),
                        ),
                ),
                if (offer.discountPercent != null)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '-${offer.discountPercent}%',
                        style: theme.textTheme.labelMedium
                            ?.copyWith(color: theme.colorScheme.onPrimary, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                Positioned(
                  top: 4,
                  right: 4,
                  child: IconButton(
                    icon: Icon(
                      isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: isFavorite ? theme.colorScheme.primary : Colors.white,
                    ),
                    onPressed: onFavoriteToggle,
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    offer.serviceName,
                    style: theme.textTheme.labelMedium
                        ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    offer.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (offer.discountedPrice != null) ...[
                        Text(
                          NumberFormat.simpleCurrency().format(offer.discountedPrice),
                          style: theme.textTheme.titleSmall
                              ?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                        ),
                        if (offer.originalPrice != null) ...[
                          const SizedBox(width: 6),
                          Text(
                            NumberFormat.simpleCurrency().format(offer.originalPrice),
                            style: theme.textTheme.bodySmall?.copyWith(
                              decoration: TextDecoration.lineThrough,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                      const Spacer(),
                      Text(
                        daysLeft <= 0 ? 'Ends today' : '$daysLeft d left',
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
