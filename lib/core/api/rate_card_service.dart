import '../../models/rate_card.dart';
import 'api_client.dart';

class RateCardService {
  final ApiClient _client = ApiClient();

  Future<List<RateCard>> list({String? tier}) async {
    final data = await _client.get('/rate_cards/list.php', query: {
      if (tier != null) 'tier': tier,
    });
    return (data['rate_cards'] as List).map((e) => RateCard.fromJson(e as Map<String, dynamic>)).toList();
  }
}
