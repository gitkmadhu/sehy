import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/analytics/analytics_service.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/favorites_provider.dart';
import 'providers/notifications_provider.dart';
import 'providers/offers_provider.dart';
import 'screens/auth/auth_gate.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Fire-and-forget: screens call AnalyticsService.trackCategoryView/trackServiceView
  // regardless of whether this has finished, and those no-op until it has
  // (see analytics_service.dart) — the app never waits on this to launch.
  AnalyticsService.initialize();
  runApp(const SehyApp());
}

class SehyApp extends StatelessWidget {
  const SehyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => OffersProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
      ],
      child: MaterialApp(
        title: 'Sehy - Local Classifieds',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        home: const AuthGate(),
      ),
    );
  }
}
