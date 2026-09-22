import 'package:flutter/foundation.dart';

import '../core/api/offer_service.dart';
import '../models/offer.dart';

class OffersProvider extends ChangeNotifier {
  final OfferService _offerService = OfferService();

  List<Offer> offers = [];
  bool loading = false;
  String? error;
  int? selectedCategoryId;
  String searchQuery = '';

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      offers = await _offerService.list(
        tagId: selectedCategoryId,
        query: searchQuery.isEmpty ? null : searchQuery,
      );
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void setCategory(int? tagId) {
    selectedCategoryId = tagId;
    load();
  }

  void search(String query) {
    searchQuery = query;
    load();
  }
}
