import '../../models/offer.dart';
import 'api_client.dart';

class OfferService {
  final ApiClient _client = ApiClient();

  Future<List<Offer>> list({int? categoryId, int? storeId, String? query, int? limit}) async {
    final data = await _client.get('/offers/list.php', query: {
      if (categoryId != null) 'category_id': '$categoryId',
      if (storeId != null) 'store_id': '$storeId',
      if (query != null && query.isNotEmpty) 'q': query,
      if (limit != null) 'limit': '$limit',
    });
    return (data['offers'] as List).map((e) => Offer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Offer> get(int id) async {
    final data = await _client.get('/offers/get.php', query: {'id': '$id'});
    return Offer.fromJson(data['offer'] as Map<String, dynamic>);
  }
}
