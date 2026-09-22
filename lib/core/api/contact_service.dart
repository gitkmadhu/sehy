import 'api_client.dart';

/// Query type options shown in the Contact Us dropdown.
const List<String> contactQueryTypes = [
  'General Inquiry',
  'Report an Issue',
  'Service/Category Listing Request',
  'Area Listing',
  'Feedback & Suggestions',
  'Account / Login Issue',
  'Other',
];

class ContactService {
  final ApiClient _client = ApiClient();

  Future<void> create({required String queryType, String? area, required String description}) {
    return _client.post('/contact/create.php', {
      'query_type': queryType,
      if (area != null && area.isNotEmpty) 'area': area,
      'description': description,
    });
  }
}
