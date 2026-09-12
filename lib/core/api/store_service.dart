import '../../models/store.dart';
import 'api_client.dart';

class StoreService {
  final ApiClient _client = ApiClient();

  Future<List<Store>> list({int? categoryId, int? mallId, String? city, String? query}) async {
    final data = await _client.get('/stores/list.php', query: {
      if (categoryId != null) 'category_id': '$categoryId',
      if (mallId != null) 'mall_id': '$mallId',
      if (city != null && city.isNotEmpty) 'city': city,
      if (query != null && query.isNotEmpty) 'q': query,
    });
    return (data['stores'] as List).map((e) => Store.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Store> get(int id) async {
    final data = await _client.get('/stores/get.php', query: {'id': '$id'});
    return Store.fromJson(data['store'] as Map<String, dynamic>);
  }
}
