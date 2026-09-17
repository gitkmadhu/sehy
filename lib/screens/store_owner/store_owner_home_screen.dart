import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/gradient_app_bar.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notifications_provider.dart';
import '../shared/faq_bot_screen.dart';

/// Landing screen for a signed-in store_owner — mirrors
/// MallManagerHomeScreen's notification inbox (same NotificationsProvider,
/// same user_notifications backend) but without the banner-approval queue
/// or subscription screen mall managers have, since neither exists for
/// stores yet. Tapping a notification just marks it read.
class StoreOwnerHomeScreen extends StatefulWidget {
  const StoreOwnerHomeScreen({super.key});

  @override
  State<StoreOwnerHomeScreen> createState() => _StoreOwnerHomeScreenState();
}

class _StoreOwnerHomeScreenState extends State<StoreOwnerHomeScreen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<NotificationsProvider>().load());
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

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();

    return Scaffold(
      appBar: GradientAppBar(
        pageName: 'Messages',
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'Help',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const FaqBotScreen(role: 'store_owner')),
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
                        child: const Center(child: Text('No messages yet')),
                      ),
                    ),
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: provider.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final notification = provider.items[index];
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
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: notification.isRead
                                ? Theme.of(context).colorScheme.surfaceContainerHighest
                                : Theme.of(context).colorScheme.primaryContainer,
                            child: const Icon(Icons.chat_bubble_outline),
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
                          onTap: () {
                            if (!notification.isRead) {
                              context.read<NotificationsProvider>().markRead(notification.id);
                            }
                          },
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
