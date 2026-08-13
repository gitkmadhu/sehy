import '../../models/offer.dart';
import '../../models/store.dart';
import 'api_client.dart';

class AdminService {
  final ApiClient _client = ApiClient();

  Future<({List<Store> stores, List<Offer> offers})> pending() async {
    final data = await _client.get('/admin/pending.php');
    return (
      stores: (data['stores'] as List).map((e) => Store.fromJson(e as Map<String, dynamic>)).toList(),
      offers: (data['offers'] as List).map((e) => Offer.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<void> reviewStore(int id, String status) =>
      _client.post('/admin/review_store.php', {'id': id, 'status': status});

  Future<void> reviewOffer(int id, String status) =>
      _client.post('/admin/review_offer.php', {'id': id, 'status': status});
}
