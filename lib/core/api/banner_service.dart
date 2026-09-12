import '../../models/promo_banner.dart';
import 'api_client.dart';

class BannerService {
  final ApiClient _client = ApiClient();

  Future<List<PromoBanner>> list() async {
    final data = await _client.get('/banners/list.php');
    return (data['banners'] as List)
        .map((e) => PromoBanner.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
