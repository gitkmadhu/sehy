import '../../models/service.dart';
import 'api_client.dart';

class ServiceApi {
  final ApiClient _client = ApiClient();

  Future<List<Service>> list({int? tagId, int? categoryId, String? area, String? query}) async {
    final data = await _client.get('/services/list.php', query: {
      if (tagId != null) 'tag_id': '$tagId',
      if (categoryId != null) 'category_id': '$categoryId',
      if (area != null && area.isNotEmpty) 'area': area,
      if (query != null && query.isNotEmpty) 'q': query,
    });
    return (data['services'] as List).map((e) => Service.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Service> get(int id) async {
    final data = await _client.get('/services/get.php', query: {'id': '$id'});
    return Service.fromJson(data['service'] as Map<String, dynamic>);
  }

  /// Submits a new service_owner listing — see services/create.php. Requires
  /// a logo image and (for a service_owner, not an admin/category_manager) a
  /// GSTIN or PAN plus an allocation-proof document, and the account's
  /// one-time listing fee to already be paid (a 402 ApiException otherwise).
  Future<Map<String, dynamic>> create({
    required String name,
    required String email,
    String? description,
    String? phone,
    String? website,
    String? whatsapp,
    String? address,
    String? area,
    int? categoryId,
    int? unitId,
    int? tagId,
    String? gstin,
    String? pan,
    required String logoPath,
    String? coverPath,
    String? allocationProofPath,
  }) async {
    final data = await _client.postMultipart(
      '/services/create.php',
      {
        'name': name,
        'email': email,
        if (description != null && description.isNotEmpty) 'description': description,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (website != null && website.isNotEmpty) 'website': website,
        if (whatsapp != null && whatsapp.isNotEmpty) 'whatsapp': whatsapp,
        if (address != null && address.isNotEmpty) 'address': address,
        if (area != null && area.isNotEmpty) 'area': area,
        if (categoryId != null) 'category_id': '$categoryId',
        if (unitId != null) 'unit_id': '$unitId',
        if (tagId != null) 'tag_id': '$tagId',
        if (gstin != null && gstin.isNotEmpty) 'gstin': gstin,
        if (pan != null && pan.isNotEmpty) 'pan': pan,
      },
      filePathsByField: {
        'logo': logoPath,
        if (coverPath != null) 'cover': coverPath,
        if (allocationProofPath != null) 'allocation_proof': allocationProofPath,
      },
    );
    return data;
  }
}
