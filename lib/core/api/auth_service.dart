import '../../models/user.dart';
import 'api_client.dart';
import 'token_store.dart';

class AuthService {
  final ApiClient _client = ApiClient();
  final TokenStore _tokenStore = TokenStore();

  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
    String role = 'shopper',
    String? phone,
  }) async {
    final data = await _client.post('/auth/register.php', {
      'name': name,
      'email': email,
      'password': password,
      'role': role,
      if (phone != null) 'phone': phone,
    });
    await _tokenStore.save(data['token'] as String);
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
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
