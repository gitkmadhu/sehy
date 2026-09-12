/// A banner ("ad") for a mall or store's public page. Shared by two shapes
/// of response:
///  - the public list.php endpoints (mall_ads/list.php, store_ads/list.php)
///    return only approved ads as {id, image_url, link_url} — mallId/status/
///    uploadedByName/createdAt are null in that case.
///  - mall_ads/mine.php (signed-in mall_manager/mall_staff) returns every
///    field below, for any status, so MallAdService.mine() can drive the
///    banner-request review screen.
class MallAd {
  final int id;
  final String imageUrl;
  final String? linkUrl;
  final int? mallId;
  final String? status;
  final String? reviewNote;
  final String? uploadedByName;
  final DateTime? createdAt;

  const MallAd({
    required this.id,
    required this.imageUrl,
    this.linkUrl,
    this.mallId,
    this.status,
    this.reviewNote,
    this.uploadedByName,
    this.createdAt,
  });

  factory MallAd.fromJson(Map<String, dynamic> json) => MallAd(
        id: int.parse(json['id'].toString()),
        imageUrl: json['image_url'] as String,
        linkUrl: json['link_url'] as String?,
        mallId: json['mall_id'] == null ? null : int.parse(json['mall_id'].toString()),
        status: json['status'] as String?,
        reviewNote: json['review_note'] as String?,
        uploadedByName: json['uploaded_by_name'] as String?,
        createdAt: json['created_at'] == null ? null : DateTime.parse(json['created_at'] as String),
      );
}
