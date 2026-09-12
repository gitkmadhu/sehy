import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/purchases/purchase_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/user_notification.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notifications_provider.dart';
import 'banner_request_screen.dart';
import 'mall_subscription_screen.dart';

/// Landing screen for a signed-in mall_manager — the app is otherwise
/// restricted to shoppers (see AuthProvider), so this role never sees
/// HomeShell. Lists their in-app notifications (currently just
/// 'mall_ad_pending' banner requests); tapping one marks it read and opens
/// BannerRequestScreen to review/approve.
class MallManagerHomeScreen extends StatefulWidget {
  const MallManagerHomeScreen({super.key});

  @override
  State<MallManagerHomeScreen> createState() => _MallManagerHomeScreenState();
}

class _MallManagerHomeScreenState extends State<MallManagerHomeScreen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsProvider>().load();
      final userId = context.read<AuthProvider>().user?.id;
      // Best-effort — without real RevenueCat API keys configured (see
      // PurchaseService) this silently fails, which is fine: it only
      // matters once someone actually opens the Subscription screen.
      if (userId != null) PurchaseService.logIn(userId).catchError((_) {});
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) context.read<NotificationsProvider>().load();
  }

  Future<void> _openRequest(UserNotification notification) async {
    final provider = context.read<NotificationsProvider>();
    if (!notification.isRead) await provider.markRead(notification.id);
    final mallAdId = notification.mallAdId;
    if (mallAdId == null || !mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => BannerRequestScreen(mallAdId: mallAdId)),
    );
    if (mounted) provider.load();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();

    return Scaffold(
      appBar: GradientAppBar(
        pageName: 'Requests',
        actions: [
          IconButton(
            icon: const Icon(Icons.workspace_premium_outlined),
            tooltip: 'Subscription',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MallSubscriptionScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: provider.load,
        child: provider.loading && provider.items.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : provider.items.isEmpty
                ? LayoutBuilder(
                    builder: (context, constraints) => SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: SizedBox(
                        height: constraints.maxHeight,
                        child: const Center(child: Text('No banner requests right now')),
                      ),
                    ),
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: provider.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final notification = provider.items[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: notification.isRead
                              ? Theme.of(context).colorScheme.surfaceContainerHighest
                              : Theme.of(context).colorScheme.primaryContainer,
                          child: const Icon(Icons.campaign_outlined),
                        ),
                        title: Text(
                          notification.title,
                          style: TextStyle(
                            fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
                          ),
                        ),
                        subtitle: Text(notification.body),
                        trailing: Text(
                          DateFormat.MMMd().add_jm().format(notification.createdAt),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        onTap: () => _openRequest(notification),
                      );
                    },
                  ),
      ),
    );
  }
}
