import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/store_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/store.dart';
import 'store_detail_screen.dart';

class StoresListScreen extends StatefulWidget {
  const StoresListScreen({super.key});

  @override
  State<StoresListScreen> createState() => _StoresListScreenState();
}

class _StoresListScreenState extends State<StoresListScreen> {
  final _storeService = StoreService();
  List<Store> _stores = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({String? query}) async {
    setState(() => _loading = true);
    try {
      final stores = await _storeService.list(query: query);
      setState(() {
        _stores = stores;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const GradientAppBar(pageName: 'Stores & Malls'),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search stores...',
                prefixIcon: Icon(Icons.search),
              ),
              onSubmitted: (q) => _load(query: q),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!))
                    : _stores.isEmpty
                        ? const Center(child: Text('No stores found'))
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _stores.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final store = _stores[index];
                              return Card(
                                child: ListTile(
                                  contentPadding: const EdgeInsets.all(12),
                                  leading: CircleAvatar(
                                    radius: 26,
                                    backgroundImage: store.logoUrl == null
                                        ? null
                                        : CachedNetworkImageProvider(store.logoUrl!),
                                    child: store.logoUrl == null ? const Icon(Icons.storefront) : null,
                                  ),
                                  title: Text(store.name),
                                  subtitle: Text(store.categoryName ?? store.address ?? ''),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => StoreDetailScreen(storeId: store.id)),
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
