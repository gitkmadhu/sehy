import 'package:flutter/material.dart';

import '../../core/api/store_service.dart';
import '../../models/store.dart';
import 'create_store_screen.dart';
import 'store_offers_screen.dart';

class MyStoreScreen extends StatefulWidget {
  const MyStoreScreen({super.key});

  @override
  State<MyStoreScreen> createState() => _MyStoreScreenState();
}

class _MyStoreScreenState extends State<MyStoreScreen> {
  final _storeService = StoreService();
  List<Store> _stores = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final stores = await _storeService.mine();
    setState(() {
      _stores = stores;
      _loading = false;
    });
  }

  Color _statusColor(String status, BuildContext context) {
    switch (status) {
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Store')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.of(context)
              .push<bool>(MaterialPageRoute(builder: (_) => const CreateStoreScreen()));
          if (created == true) _load();
        },
        icon: const Icon(Icons.add),
        label: const Text('Add store'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _stores.isEmpty
              ? const Center(child: Text('You have no stores yet. Tap "Add store" to get started.'))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                  itemCount: _stores.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final store = _stores[index];
                    return Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(12),
                        title: Text(store.name),
                        subtitle: Text(
                          store.status.toUpperCase(),
                          style: TextStyle(
                            color: _statusColor(store.status, context),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => StoreOffersScreen(storeId: store.id, storeName: store.name),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
