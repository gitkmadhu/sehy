import '../../models/mall_ad.dart';
import 'api_client.dart';

class MallAdService {
  final ApiClient _client = ApiClient();

  /// Approved ads for a mall's public page banner. No auth required. See
  /// mall_ads/list.php.
  Future<List<MallAd>> list(int mallId) async {
    final data = await _client.get('/mall_ads/list.php', query: {'mall_id': '$mallId'});
    return (data['ads'] as List).map((e) => MallAd.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Every ad for the signed-in mall_manager's own mall (any status) — see
  /// mall_ads/mine.php.
  Future<List<MallAd>> mine() async {
    final data = await _client.get('/mall_ads/mine.php');
    return (data['ads'] as List).map((e) => MallAd.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Approves or rejects a pending ad — a mall_manager's 'approved' publishes
  /// immediately (see mall_ads/review.php). [note] is required by the
  /// backend when rejecting.
  Future<void> review(int id, String status, {String? note}) => _client.post('/mall_ads/review.php', {
        'id': id,
        'status': status,
        if (note != null) 'note': note,
      });
}
