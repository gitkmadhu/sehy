import '../../models/store.dart';
import 'api_client.dart';

class StoreService {
  final ApiClient _client = ApiClient();

  Future<List<Store>> list({int? categoryId, int? mallId, String? query}) async {
    final data = await _client.get('/stores/list.php', query: {
      if (categoryId != null) 'category_id': '$categoryId',
      if (mallId != null) 'mall_id': '$mallId',
      if (query != null && query.isNotEmpty) 'q': query,
    });
    return (data['stores'] as List).map((e) => Store.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Store> get(int id) async {
    final data = await _client.get('/stores/get.php', query: {'id': '$id'});
    return Store.fromJson(data['store'] as Map<String, dynamic>);
  }

  Future<List<Store>> mine() async {
    final data = await _client.get('/stores/mine.php');
    return (data['stores'] as List).map((e) => Store.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> create({
    required String name,
    String? description,
    String? address,
    double? latitude,
    double? longitude,
    String? phone,
    String? website,
    int? categoryId,
    String? logoPath,
  }) {
    return _client.postMultipart(
      '/stores/create.php',
      {
        'name': name,
        if (description != null) 'description': description,
        if (address != null) 'address': address,
        if (latitude != null) 'latitude': '$latitude',
        if (longitude != null) 'longitude': '$longitude',
        if (phone != null) 'phone': phone,
        if (website != null) 'website': website,
        if (categoryId != null) 'category_id': '$categoryId',
      },
      filePathsByField: logoPath == null ? {} : {'logo': logoPath},
    );
  }
}
