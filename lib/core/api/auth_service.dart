import '../../models/user.dart';
import 'api_client.dart';
import 'token_store.dart';

class AuthService {
  final ApiClient _client = ApiClient();
  final TokenStore _tokenStore = TokenStore();

  /// Returns [user] on immediate signup, or a non-null [pendingMessage] when
  /// the account (e.g. a mall_manager) needs admin approval before login.
  Future<({AppUser? user, String? pendingMessage})> register({
    required String name,
    required String email,
    required String password,
    String role = 'shopper',
    String? phone,
    int? mallId,
    int? storeId,
  }) async {
    final data = await _client.post('/auth/register.php', {
      'name': name,
      'email': email,
      'password': password,
      'role': role,
      if (phone != null) 'phone': phone,
      if (mallId != null) 'mall_id': mallId,
      if (storeId != null) 'store_id': storeId,
    });
    if (data['pending'] == true) {
      return (user: null, pendingMessage: data['message'] as String?);
    }
    await _tokenStore.save(data['token'] as String);
    return (user: AppUser.fromJson(data['user'] as Map<String, dynamic>), pendingMessage: null);
  }

  Future<AppUser> login({required String email, required String password}) async {
    final data = await _client.post('/auth/login.php', {
      'email': email,
      'password': password,
    });
    await _tokenStore.save(data['token'] as String);
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<AppUser?> currentUser() async {
    final token = await _tokenStore.read();
    if (token == null) return null;
    try {
      final data = await _client.get('/auth/me.php');
      return AppUser.fromJson(data['user'] as Map<String, dynamic>);
    } catch (_) {
      await _tokenStore.clear();
      return null;
    }
  }

  Future<void> logout() => _tokenStore.clear();
}
