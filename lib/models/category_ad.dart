/// A banner ("ad") for a category or service's public page. Shared by two shapes
/// of response:
///  - the public list.php endpoints (category_ads/list.php, service_ads/list.php)
///    return only approved ads as {id, image_url, link_url} — categoryId/status/
///    uploadedByName/createdAt are null in that case.
///  - category_ads/mine.php (signed-in category_manager/category_staff) returns every
///    field below, for any status, so CategoryAdService.mine() can drive the
///    banner-request review screen.
class CategoryAd {
  final int id;
  final String imageUrl;
  final String? linkUrl;
  final int? categoryId;
  final String? status;
  final String? reviewNote;
  final String? uploadedByName;
  final DateTime? createdAt;

  const CategoryAd({
    required this.id,
    required this.imageUrl,
    this.linkUrl,
    this.categoryId,
    this.status,
    this.reviewNote,
    this.uploadedByName,
    this.createdAt,
  });

  factory CategoryAd.fromJson(Map<String, dynamic> json) => CategoryAd(
        id: int.parse(json['id'].toString()),
        imageUrl: json['image_url'] as String,
        linkUrl: json['link_url'] as String?,
        categoryId: json['category_id'] == null ? null : int.parse(json['category_id'].toString()),
        status: json['status'] as String?,
        reviewNote: json['review_note'] as String?,
        uploadedByName: json['uploaded_by_name'] as String?,
        createdAt: json['created_at'] == null ? null : DateTime.parse(json['created_at'] as String),
      );
}
