import 'api_client.dart';

/// Query type options shown in the Contact Us dropdown.
const List<String> contactQueryTypes = [
  'General Inquiry',
  'Report an Issue',
  'Store/Mall Listing Request',
  'City Listing',
  'Feedback & Suggestions',
  'Account / Login Issue',
  'Other',
];

class ContactService {
  final ApiClient _client = ApiClient();

  Future<void> create({required String queryType, String? city, required String description}) {
    return _client.post('/contact/create.php', {
      'query_type': queryType,
      if (city != null && city.isNotEmpty) 'city': city,
      'description': description,
    });
  }
}
