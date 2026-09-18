import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/push/push_service.dart';
import '../../providers/auth_provider.dart';
import '../home/home_shell.dart';
import '../mall_manager/mall_manager_home_screen.dart';
import '../store_owner/store_owner_home_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  // Registers this device for push once, the first time we know the user
  // is signed in — regardless of role, since users.fcm_token is generic
  // and broadcast_push() isn't role-specific. Guarded by this flag since
  // build() re-runs on every AuthProvider change, not just the initial
  // sign-in.
  bool _pushInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<AuthProvider>().bootstrap());
  }

  @override
  Widget build(BuildContext context) {
    // Covers a mall_manager/store_owner already logged in when the app
    // cold-starts — bootstrap() restores their session before this
    // rebuilds. Every other signed-in role (or no session yet) falls
    // through to the shopper HomeShell as before.
    final authProvider = context.watch<AuthProvider>();
    if (authProvider.status == AuthStatus.authenticated) {
      if (!_pushInitialized) {
        _pushInitialized = true;
        // Fire-and-forget, same tolerance as AnalyticsService.initialize()
        // in main.dart — PushService itself has no try/catch, so this is
        // where that safety net belongs.
        PushService().initialize().catchError((_) {});
      }
      if (authProvider.user?.role == 'mall_manager') return const MallManagerHomeScreen();
      if (authProvider.user?.role == 'store_owner') return const StoreOwnerHomeScreen();
    }
    return const HomeShell();
  }
}
