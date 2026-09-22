import '../../models/tag.dart';
import 'api_client.dart';

class TagService {
  final ApiClient _client = ApiClient();

  Future<List<Tag>> list() async {
    final data = await _client.get('/tags/list.php');
    return (data['tags'] as List).map((e) => Tag.fromJson(e as Map<String, dynamic>)).toList();
  }
}
