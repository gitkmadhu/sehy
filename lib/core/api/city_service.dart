import '../../models/city.dart';
import 'api_client.dart';

class CityService {
  final ApiClient _client = ApiClient();

  Future<List<City>> list() async {
    final data = await _client.get('/cities/list.php');
    return (data['cities'] as List).map((e) => City.fromJson(e as Map<String, dynamic>)).toList();
  }
}
