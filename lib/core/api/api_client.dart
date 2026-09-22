import 'dart:convert';
import 'package:http/http.dart' as http;

import 'api_config.dart';
import 'api_exception.dart';
import 'token_store.dart';

/// Thin wrapper around the PHP REST API under sehy_api/endpoints/.
///
/// Every endpoint responds with `{"success": bool, "data": ...}` or
/// `{"success": false, "error": "..."}`; this client unwraps that envelope
/// and throws [ApiException] on failure.
class ApiClient {
  final TokenStore _tokenStore = TokenStore();

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path').replace(queryParameters: query);
    final response = await http.get(uri, headers: await _headers());
    return _unwrap(response);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final response = await http.post(
      uri,
      headers: {...await _headers(), 'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return _unwrap(response);
  }

  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final response = await http.put(
      uri,
      headers: {...await _headers(), 'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return _unwrap(response);
  }

  Future<Map<String, dynamic>> delete(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final response = await http.delete(
      uri,
      headers: {...await _headers(), 'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return _unwrap(response);
  }

  /// Multipart POST for endpoints that accept an uploaded image (e.g. service/offer logos).
  Future<Map<String, dynamic>> postMultipart(
    String path,
    Map<String, String> fields, {
    Map<String, String> filePathsByField = const {},
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(await _headers());
    request.fields.addAll(fields);

    for (final entry in filePathsByField.entries) {
      request.files.add(await http.MultipartFile.fromPath(entry.key, entry.value));
    }

    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _unwrap(response);
  }

  Future<Map<String, String>> _headers() async {
    final token = await _tokenStore.read();
    return token == null ? {} : {'Authorization': 'Bearer $token'};
  }

  Map<String, dynamic> _unwrap(http.Response response) {
    Map<String, dynamic> json;
    try {
      json = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('Unexpected server response (${response.statusCode})', response.statusCode);
    }

    if (json['success'] == true) {
      return (json['data'] as Map<String, dynamic>?) ?? {};
    }
    throw ApiException(json['error'] as String? ?? 'Something went wrong', response.statusCode);
  }
}
