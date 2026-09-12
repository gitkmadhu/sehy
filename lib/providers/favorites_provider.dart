import 'package:flutter/foundation.dart';

import '../core/api/favorite_service.dart';
import '../core/api/token_store.dart';
import '../models/offer.dart';

class FavoritesProvider extends ChangeNotifier {
  final FavoriteService _favoriteService = FavoriteService();
  final TokenStore _tokenStore = TokenStore();

  List<Offer> offers = [];
  bool loading = false;
  final Set<int> _favoriteIds = {};

  bool isFavorite(int offerId) => _favoriteIds.contains(offerId);

  Future<void> load() async {
    if (await _tokenStore.read() == null) {
      offers = [];
      _favoriteIds.clear();
      notifyListeners();
      return;
    }
    loading = true;
    notifyListeners();
    try {
      offers = await _favoriteService.list();
      _favoriteIds
        ..clear()
        ..addAll(offers.map((o) => o.id));
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> toggle(int offerId) async {
    if (_favoriteIds.contains(offerId)) {
      _favoriteIds.remove(offerId);
      notifyListeners();
      await _favoriteService.remove(offerId);
    } else {
      _favoriteIds.add(offerId);
      notifyListeners();
      await _favoriteService.add(offerId);
    }
  }
}
