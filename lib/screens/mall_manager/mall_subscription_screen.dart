import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

import '../../core/api/mall_service.dart';
import '../../core/api/mall_subscription_service.dart';
import '../../core/purchases/purchase_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/mall.dart';
import '../../providers/auth_provider.dart';

/// Lets a mall_manager/mall_staff buy the mall's ad-upload subscription via
/// Apple Pay / Google Pay (RevenueCat) — the mobile counterpart to the
/// Razorpay picker on the website's manager-dashboard.html. A mall banner
/// publishes immediately once this subscription is active (see
/// mall_ads/create.php) — there's no separate approval step to wait on.
///
/// Purchasing and pricing are both handled by RevenueCat's own hosted
/// Paywall (designed in the RevenueCat dashboard, not in this file) —
/// low-maintenance on our side: no plan list or price formatting to keep in
/// sync here. "Manage Subscription" opens RevenueCat's Customer Center for
/// self-service (view receipts, cancel, restore).
class MallSubscriptionScreen extends StatefulWidget {
  const MallSubscriptionScreen({super.key});

  @override
  State<MallSubscriptionScreen> createState() => _MallSubscriptionScreenState();
}

class _MallSubscriptionScreenState extends State<MallSubscriptionScreen> {
  final _mallService = MallService();
  final _mallSubscriptionService = MallSubscriptionService();

  Mall? _mall;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final mallId = context.read<AuthProvider>().user?.mallId;
    if (mallId == null) {
      setState(() => _error = 'Your account is not linked to a mall yet. Contact the admin.');
      return;
    }
    try {
      final mall = await _mallService.get(mallId);
      if (mounted) setState(() => _mall = mall);
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
        // re-verify with RevenueCat's own API and extend the mall's
        // subscription — see revenuecat_sync.php. The webhook does this too
        // (whichever arrives first wins), this is just the fast path.
        final customerInfo = await PurchaseService.getCustomerInfo();
        final planKey = customerInfo.entitlements.active[PurchaseService.entitlementId]?.productIdentifier;
        if (planKey != null) await _mallSubscriptionService.syncPurchase(planKey: planKey);
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
    final mall = _mall;
    if (mall == null) {
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
                mall.hasActiveAdSubscription ? Icons.check_circle : Icons.error_outline,
                color: mall.hasActiveAdSubscription ? Colors.green : Colors.orange,
              ),
              title: Text(mall.hasActiveAdSubscription ? 'Subscription active' : 'No active subscription'),
              subtitle: Text(
                mall.subscriptionExpiresAt == null
                    ? 'Subscribe below to start publishing banners'
                    : '${mall.hasActiveAdSubscription ? "Renews or expires" : "Expired"} on '
                        '${DateFormat.yMMMd().format(mall.subscriptionExpiresAt!)}',
              ),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _openPaywall,
            child: _busy
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(mall.hasActiveAdSubscription ? 'Change Plan' : 'Subscribe'),
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
