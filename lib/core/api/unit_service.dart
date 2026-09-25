import '../../models/unit.dart';
import 'api_client.dart';

class UnitService {
  final ApiClient _client = ApiClient();

  Future<List<Unit>> list({int? categoryId}) async {
    final data = await _client.get('/units/list.php', query: {
      if (categoryId != null) 'category_id': '$categoryId',
    });
    return (data['units'] as List).map((e) => Unit.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Unit> get(int id) async {
    final data = await _client.get('/units/get.php', query: {'id': '$id'});
    return Unit.fromJson(data['unit'] as Map<String, dynamic>);
  }
}
