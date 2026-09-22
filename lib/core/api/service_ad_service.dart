import '../../models/category_ad.dart';
import 'api_client.dart';

/// The service-level counterpart to CategoryAdService — same shape, reuses the
/// CategoryAd model since service_ads and category_ads share an identical schema.
class ServiceAdService {
  final ApiClient _client = ApiClient();

  /// Approved ads for a service's public page banner. No auth required.
  Future<List<CategoryAd>> list(int serviceId) async {
    final data = await _client.get('/service_ads/list.php', query: {'service_id': '$serviceId'});
    return (data['ads'] as List).map((e) => CategoryAd.fromJson(e as Map<String, dynamic>)).toList();
  }
}
