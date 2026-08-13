import 'package:flutter/material.dart';

import '../../core/api/admin_service.dart';
import '../../models/offer.dart';
import '../../models/store.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  final _adminService = AdminService();
  List<Store> _stores = [];
  List<Offer> _offers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final result = await _adminService.pending();
    setState(() {
      _stores = result.stores;
      _offers = result.offers;
      _loading = false;
    });
  }

  Future<void> _reviewStore(int id, String status) async {
    await _adminService.reviewStore(id, status);
    _load();
  }

  Future<void> _reviewOffer(int id, String status) async {
    await _adminService.reviewOffer(id, status);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Pending Approvals'),
          bottom: TabBar(
            tabs: [
              Tab(text: 'Stores (${_stores.length})'),
              Tab(text: 'Offers (${_offers.length})'),
            ],
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [
                  _buildStoreList(),
                  _buildOfferList(),
                ],
              ),
      ),
    );
  }

  Widget _buildStoreList() {
    if (_stores.isEmpty) return const Center(child: Text('No stores awaiting review'));
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _stores.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final store = _stores[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(store.name, style: Theme.of(context).textTheme.titleMedium),
                if (store.description != null) Text(store.description!),
                const SizedBox(height: 12),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: () => _reviewStore(store.id, 'rejected'),
                      child: const Text('Reject'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => _reviewStore(store.id, 'approved'),
                      child: const Text('Approve'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildOfferList() {
    if (_offers.isEmpty) return const Center(child: Text('No offers awaiting review'));
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _offers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final offer = _offers[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(offer.storeName, style: Theme.of(context).textTheme.labelMedium),
                Text(offer.title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: () => _reviewOffer(offer.id, 'rejected'),
                      child: const Text('Reject'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => _reviewOffer(offer.id, 'approved'),
                      child: const Text('Approve'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
