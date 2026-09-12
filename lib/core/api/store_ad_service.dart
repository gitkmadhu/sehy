import '../../models/mall_ad.dart';
import 'api_client.dart';

/// The store-level counterpart to MallAdService — same shape, reuses the
/// MallAd model since store_ads and mall_ads share an identical schema.
class StoreAdService {
  final ApiClient _client = ApiClient();

  /// Approved ads for a store's public page banner. No auth required.
  Future<List<MallAd>> list(int storeId) async {
    final data = await _client.get('/store_ads/list.php', query: {'store_id': '$storeId'});
    return (data['ads'] as List).map((e) => MallAd.fromJson(e as Map<String, dynamic>)).toList();
  }
}
