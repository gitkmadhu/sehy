import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/api/mall_ad_service.dart';
import '../../core/api/mall_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/mall.dart';
import '../../models/mall_ad.dart';

/// Review screen for one mall_ads banner request — preview, who submitted
/// it, the mall's ad-subscription standing, and Approve/Reject. Approve
/// publishes the banner live on the mall's public page immediately (see
/// mall_ads/review.php).
class BannerRequestScreen extends StatefulWidget {
  final int mallAdId;

  const BannerRequestScreen({super.key, required this.mallAdId});

  @override
  State<BannerRequestScreen> createState() => _BannerRequestScreenState();
}

class _BannerRequestScreenState extends State<BannerRequestScreen> {
  final _mallAdService = MallAdService();
  final _mallService = MallService();

  MallAd? _ad;
  Mall? _mall;
  String? _error;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final ads = await _mallAdService.mine();
      final ad = ads.firstWhere((a) => a.id == widget.mallAdId);
      final mall = await _mallService.get(ad.mallId!);
      if (!mounted) return;
      setState(() {
        _ad = ad;
        _mall = mall;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _decide(String status) async {
    if (status == 'rejected') {
      final note = await _promptForRejectNote();
      if (note == null) return; // cancelled
      await _submitReview(status, note: note);
    } else {
      await _submitReview(status);
    }
  }

  Future<String?> _promptForRejectNote() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reason for rejecting'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(hintText: 'Explain what needs to change...'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  Future<void> _submitReview(String status, {String? note}) async {
    if (note != null && note.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('A reason is required when rejecting')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await _mallAdService.review(widget.mallAdId, status, note: note);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(status == 'approved' ? 'Banner published' : 'Request rejected')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: const GradientAppBar(pageName: 'Banner Request'),
        body: Center(child: Text(_error!)),
      );
    }
    final ad = _ad;
    final mall = _mall;
    if (ad == null || mall == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isPending = ad.status == 'pending';
    final subscriptionActive = mall.hasActiveAdSubscription;

    return Scaffold(
      appBar: GradientAppBar(pageName: 'Banner Request'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 16 / 7,
              child: CachedNetworkImage(imageUrl: ad.imageUrl, fit: BoxFit.cover),
            ),
          ),
          const SizedBox(height: 20),
          _InfoRow(label: 'Mall', value: mall.name),
          _InfoRow(label: 'Submitted by', value: ad.uploadedByName ?? 'Unknown'),
          _InfoRow(label: 'Submitted', value: DateFormat.yMMMd().add_jm().format(ad.createdAt!)),
          if (ad.linkUrl != null) _InfoRow(label: 'Links to', value: ad.linkUrl!),
          const Divider(height: 32),
          Text('Ad subscription', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                subscriptionActive ? Icons.check_circle : Icons.error,
                color: subscriptionActive ? Colors.green : Colors.red,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  mall.subscriptionExpiresAt == null
                      ? 'No active subscription'
                      : subscriptionActive
                          ? 'Active until ${DateFormat.yMMMd().format(mall.subscriptionExpiresAt!)}'
                          : 'Expired on ${DateFormat.yMMMd().format(mall.subscriptionExpiresAt!)}',
                ),
              ),
            ],
          ),
          if (!isPending) ...[
            const Divider(height: 32),
            Text('This request was already ${ad.status}.', style: Theme.of(context).textTheme.bodyMedium),
            if (ad.reviewNote != null) Text(ad.reviewNote!, style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 28),
          if (isPending)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting ? null : () => _decide('rejected'),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _submitting ? null : () => _decide('approved'),
                    child: _submitting
                        ? const SizedBox(
                            height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Approve'),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyMedium)),
        ],
      ),
    );
  }
}
