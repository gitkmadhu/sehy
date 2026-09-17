import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
      if (authProvider.user?.role == 'mall_manager') return const MallManagerHomeScreen();
      if (authProvider.user?.role == 'store_owner') return const StoreOwnerHomeScreen();
    }
    return const HomeShell();
  }
}
