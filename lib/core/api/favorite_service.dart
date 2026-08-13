import '../../models/offer.dart';
import 'api_client.dart';

class FavoriteService {
  final ApiClient _client = ApiClient();

  Future<List<Offer>> list() async {
    final data = await _client.get('/favorites/list.php');
    return (data['offers'] as List).map((e) => Offer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> add(int offerId) => _client.post('/favorites/add.php', {'offer_id': offerId});

  Future<void> remove(int offerId) => _client.delete('/favorites/remove.php', {'offer_id': offerId});
}
