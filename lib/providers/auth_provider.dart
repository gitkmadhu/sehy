import 'package:flutter/foundation.dart';

import '../core/api/auth_service.dart';
import '../models/user.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  AuthStatus status = AuthStatus.unknown;
  AppUser? user;
  String? error;

  Future<void> bootstrap() async {
    user = await _authService.currentUser();
    status = user == null ? AuthStatus.unauthenticated : AuthStatus.authenticated;
    notifyListeners();
  }

  Future<bool> login(String email, String password) => _run(
        () => _authService.login(email: email, password: password),
      );

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    required String role,
  }) =>
      _run(() => _authService.register(name: name, email: email, password: password, role: role));

  Future<void> logout() async {
    await _authService.logout();
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> _run(Future<AppUser> Function() action) async {
    error = null;
    try {
      user = await action();
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
