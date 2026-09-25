import '../../models/home_section.dart';
import 'api_client.dart';

class HomeSectionService {
  final ApiClient _client = ApiClient();

  Future<List<HomeSection>> list() async {
    final data = await _client.get('/home/list.php');
    return (data['sections'] as List).map((e) => HomeSection.fromJson(e as Map<String, dynamic>)).toList();
  }
}
