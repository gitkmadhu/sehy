import '../../models/mall.dart';
import 'api_client.dart';

class MallService {
  final ApiClient _client = ApiClient();

  Future<List<Mall>> list({String? city}) async {
    final data = await _client.get('/malls/list.php', query: {
      if (city != null && city.isNotEmpty) 'city': city,
    });
    return (data['malls'] as List).map((e) => Mall.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Mall> get(int id) async {
    final data = await _client.get('/malls/get.php', query: {'id': '$id'});
    return Mall.fromJson(data['mall'] as Map<String, dynamic>);
  }
}
