import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/purchases/purchase_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/user_notification.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notifications_provider.dart';
import '../shared/faq_bot_screen.dart';
import 'banner_request_screen.dart';
import 'category_subscription_screen.dart';

/// Landing screen for a signed-in category_manager — the app is otherwise
/// restricted to shoppers (see AuthProvider), so this role never sees
/// HomeShell. Lists their in-app notifications (currently just
/// 'category_ad_pending' banner requests); tapping one marks it read and opens
/// BannerRequestScreen to review/approve.
class CategoryManagerHomeScreen extends StatefulWidget {
  const CategoryManagerHomeScreen({super.key});

  @override
  State<CategoryManagerHomeScreen> createState() => _CategoryManagerHomeScreenState();
}

class _CategoryManagerHomeScreenState extends State<CategoryManagerHomeScreen> with WidgetsBindingObserver {
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
    final categoryAdId = notification.categoryAdId;
    if (categoryAdId == null || !mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => BannerRequestScreen(categoryAdId: categoryAdId)),
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
              MaterialPageRoute(builder: (_) => const CategorySubscriptionScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'Help',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const FaqBotScreen(role: 'category_manager')),
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
                      final tile = ListTile(
                        leading: CircleAvatar(
                          backgroundColor: notification.isRead
                              ? Theme.of(context).colorScheme.surfaceContainerHighest
                              : Theme.of(context).colorScheme.primaryContainer,
                          child: Icon(notification.type == 'admin_message'
                              ? Icons.chat_bubble_outline
                              : Icons.campaign_outlined),
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

                      // Only admin replies are deletable — a pending banner
                      // request is an actionable task, not a message, so
                      // swiping it away would hide work without resolving it.
                      if (notification.type != 'admin_message') return tile;
                      return Dismissible(
                        key: ValueKey(notification.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          color: Theme.of(context).colorScheme.errorContainer,
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Icon(Icons.delete_outline,
                              color: Theme.of(context).colorScheme.onErrorContainer),
                        ),
                        confirmDismiss: (_) => context.read<NotificationsProvider>().delete(notification.id),
                        child: tile,
                      );
                    },
                  ),
      ),
    );
  }
}
