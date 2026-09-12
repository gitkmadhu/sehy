class PromoBanner {
  final int id;
  final String imageUrl;
  final String? linkUrl;

  const PromoBanner({required this.id, required this.imageUrl, this.linkUrl});

  factory PromoBanner.fromJson(Map<String, dynamic> json) => PromoBanner(
        id: int.parse(json['id'].toString()),
        imageUrl: json['image_url'] as String,
        linkUrl: json['link_url'] as String?,
      );
}
