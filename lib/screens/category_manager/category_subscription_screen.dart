import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

import '../../core/api/category_service.dart';
import '../../core/api/category_subscription_service.dart';
import '../../core/purchases/purchase_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/category.dart';
import '../../providers/auth_provider.dart';

/// Lets a category_manager/category_staff buy the category's ad-upload subscription via
/// Apple Pay / Google Pay (RevenueCat) — the mobile counterpart to the
/// Razorpay picker on the website's manager-dashboard.html. A category banner
/// publishes immediately once this subscription is active (see
/// category_ads/create.php) — there's no separate approval step to wait on.
///
/// Purchasing and pricing are both handled by RevenueCat's own hosted
/// Paywall (designed in the RevenueCat dashboard, not in this file) —
/// low-maintenance on our side: no plan list or price formatting to keep in
/// sync here. "Manage Subscription" opens RevenueCat's Customer Center for
/// self-service (view receipts, cancel, restore).
class CategorySubscriptionScreen extends StatefulWidget {
  const CategorySubscriptionScreen({super.key});

  @override
  State<CategorySubscriptionScreen> createState() => _CategorySubscriptionScreenState();
}

class _CategorySubscriptionScreenState extends State<CategorySubscriptionScreen> {
  final _categoryService = CategoryService();
  final _categorySubscriptionService = CategorySubscriptionService();

  Category? _category;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final categoryId = context.read<AuthProvider>().user?.categoryId;
    if (categoryId == null) {
      setState(() => _error = 'Your account is not linked to a category yet. Contact the admin.');
      return;
    }
    try {
      final category = await _categoryService.get(categoryId);
      if (mounted) setState(() => _category = category);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _openPaywall() async {
    setState(() => _busy = true);
    try {
      final result = await RevenueCatUI.presentPaywallIfNeeded(PurchaseService.entitlementId);
      if (result == PaywallResult.purchased || result == PaywallResult.restored) {
        // Tells the backend which plan just became active, so it can
        // re-verify with RevenueCat's own API and extend the category's
        // subscription — see revenuecat_sync.php. The webhook does this too
        // (whichever arrives first wins), this is just the fast path.
        final customerInfo = await PurchaseService.getCustomerInfo();
        final planKey = customerInfo.entitlements.active[PurchaseService.entitlementId]?.productIdentifier;
        if (planKey != null) await _categorySubscriptionService.syncPurchase(planKey: planKey);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Subscription active — banners publish immediately now')),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: const GradientAppBar(pageName: 'Subscription'),
        body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!))),
      );
    }
    final category = _category;
    if (category == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: const GradientAppBar(pageName: 'Subscription'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: Icon(
                category.hasActiveAdSubscription ? Icons.check_circle : Icons.error_outline,
                color: category.hasActiveAdSubscription ? Colors.green : Colors.orange,
              ),
              title: Text(category.hasActiveAdSubscription ? 'Subscription active' : 'No active subscription'),
              subtitle: Text(
                category.subscriptionExpiresAt == null
                    ? 'Subscribe below to start publishing banners'
                    : '${category.hasActiveAdSubscription ? "Renews or expires" : "Expired"} on '
                        '${DateFormat.yMMMd().format(category.subscriptionExpiresAt!)}',
              ),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _openPaywall,
            child: _busy
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(category.hasActiveAdSubscription ? 'Change Plan' : 'Subscribe'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => RevenueCatUI.presentCustomerCenter(),
            child: const Text('Manage Subscription'),
          ),
        ],
      ),
    );
  }
}
