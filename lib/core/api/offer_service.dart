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

  Future<List<Offer>> mine() async {
    final data = await _client.get('/offers/mine.php');
    return (data['offers'] as List).map((e) => Offer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> create({
    required int storeId,
    required String title,
    required DateTime expiresAt,
    String? description,
    int? categoryId,
    double? originalPrice,
    double? discountedPrice,
    int? discountPercent,
    String? imagePath,
  }) {
    return _client.postMultipart(
      '/offers/create.php',
      {
        'store_id': '$storeId',
        'title': title,
        'expires_at': expiresAt.toIso8601String(),
        if (description != null) 'description': description,
        if (categoryId != null) 'category_id': '$categoryId',
        if (originalPrice != null) 'original_price': '$originalPrice',
        if (discountedPrice != null) 'discounted_price': '$discountedPrice',
        if (discountPercent != null) 'discount_percent': '$discountPercent',
      },
      filePathsByField: imagePath == null ? {} : {'image': imagePath},
    );
  }

  Future<void> delete(int id) => _client.delete('/offers/delete.php', {'id': id});
}
