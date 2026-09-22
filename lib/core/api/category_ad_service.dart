import '../../models/category_ad.dart';
import 'api_client.dart';

class CategoryAdService {
  final ApiClient _client = ApiClient();

  /// Approved ads for a category's public page banner. No auth required. See
  /// category_ads/list.php.
  Future<List<CategoryAd>> list(int categoryId) async {
    final data = await _client.get('/category_ads/list.php', query: {'category_id': '$categoryId'});
    return (data['ads'] as List).map((e) => CategoryAd.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Every ad for the signed-in category_manager's own category (any status) — see
  /// category_ads/mine.php.
  Future<List<CategoryAd>> mine() async {
    final data = await _client.get('/category_ads/mine.php');
    return (data['ads'] as List).map((e) => CategoryAd.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Approves or rejects a pending ad — a category_manager's 'approved' publishes
  /// immediately (see category_ads/review.php). [note] is required by the
  /// backend when rejecting.
  Future<void> review(int id, String status, {String? note}) => _client.post('/category_ads/review.php', {
        'id': id,
        'status': status,
        if (note != null) 'note': note,
      });
}
