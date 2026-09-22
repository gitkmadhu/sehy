import '../../models/area.dart';
import 'api_client.dart';

class AreaService {
  final ApiClient _client = ApiClient();

  Future<List<Area>> list() async {
    final data = await _client.get('/areas/list.php');
    return (data['areas'] as List).map((e) => Area.fromJson(e as Map<String, dynamic>)).toList();
  }
}
