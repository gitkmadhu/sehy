import '../../models/category.dart';
import 'api_client.dart';

class CategoryService {
  final ApiClient _client = ApiClient();

  Future<List<Category>> list({String? area}) async {
    final data = await _client.get('/categories/list.php', query: {
      if (area != null && area.isNotEmpty) 'area': area,
    });
    return (data['categories'] as List).map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Category> get(int id, {String? area}) async {
    final data = await _client.get('/categories/get.php', query: {
      'id': '$id',
      if (area != null && area.isNotEmpty) 'area': area,
    });
    return Category.fromJson(data['category'] as Map<String, dynamic>);
  }
}
