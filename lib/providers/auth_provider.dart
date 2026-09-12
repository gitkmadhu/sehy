import 'package:flutter/foundation.dart';

import '../core/api/auth_service.dart';
import '../models/user.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

enum RegisterOutcome { success, pending, failed }

/// Shown when a Store/Mall Staff, Store Owner, or Admin account tries to sign
/// in here — this app is for shoppers only; those roles manage their
/// business through the GLML CMS website instead. mall_manager is the one
/// exception — they review/approve mall banner requests from this app (see
/// MallManagerHomeScreen), so they're allowed straight through below.
const _cmsOnlyMessage =
    'This account is managed through the GLML CMS. Please sign in on the GLML website to manage your business.';

bool _isAppAllowedRole(String role) => role == 'shopper' || role == 'mall_manager';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  AuthStatus status = AuthStatus.unknown;
  AppUser? user;
  String? error;

  Future<void> bootstrap() async {
    final restored = await _authService.currentUser();
    if (restored != null && !_isAppAllowedRole(restored.role)) {
      // A staff/manager/admin session from before this app was restricted to
      // shoppers — sign them out silently rather than leaving them stranded
      // with no usable screens.
      await _authService.logout();
      user = null;
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    user = restored;
    status = user == null ? AuthStatus.unauthenticated : AuthStatus.authenticated;
    notifyListeners();
  }

  Future<bool> login(String email, String password) => _run(
        () => _authService.login(email: email, password: password),
      );

  Future<RegisterOutcome> register({
    required String name,
    required String email,
    required String password,
    required String phone,
  }) async {
    error = null;
    try {
      final result = await _authService.register(
        name: name,
        email: email,
        password: password,
        role: 'shopper',
        phone: phone,
      );
      if (result.pendingMessage != null) {
        error = result.pendingMessage;
        notifyListeners();
        return RegisterOutcome.pending;
      }
      user = result.user;
      status = AuthStatus.authenticated;
      notifyListeners();
      return RegisterOutcome.success;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return RegisterOutcome.failed;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> _run(Future<AppUser> Function() action) async {
    error = null;
    try {
      final signedInUser = await action();
      if (!_isAppAllowedRole(signedInUser.role)) {
        await _authService.logout();
        user = null;
        status = AuthStatus.unauthenticated;
        error = _cmsOnlyMessage;
        notifyListeners();
        return false;
      }
      user = signedInUser;
      status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
