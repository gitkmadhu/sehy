import 'package:flutter/material.dart';

import '../../core/api/offer_service.dart';
import '../../models/offer.dart';
import 'create_offer_screen.dart';

class StoreOffersScreen extends StatefulWidget {
  final int storeId;
  final String storeName;

  const StoreOffersScreen({super.key, required this.storeId, required this.storeName});

  @override
  State<StoreOffersScreen> createState() => _StoreOffersScreenState();
}

class _StoreOffersScreenState extends State<StoreOffersScreen> {
  final _offerService = OfferService();
  List<Offer> _offers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final all = await _offerService.mine();
    setState(() {
      _offers = all.where((o) => o.storeId == widget.storeId).toList();
      _loading = false;
    });
  }

  Future<void> _delete(int id) async {
    await _offerService.delete(id);
    _load();
  }

  Color _statusColor(String status) {
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
      appBar: AppBar(title: Text(widget.storeName)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => CreateOfferScreen(storeId: widget.storeId)),
          );
          if (created == true) _load();
        },
        icon: const Icon(Icons.add),
        label: const Text('Add offer'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _offers.isEmpty
              ? const Center(child: Text('No offers yet. Tap "Add offer" to post one.'))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                  itemCount: _offers.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final offer = _offers[index];
                    return Card(
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(12),
                        title: Text(offer.title),
                        subtitle: Text(
                          offer.status.toUpperCase(),
                          style: TextStyle(color: _statusColor(offer.status), fontWeight: FontWeight.bold),
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () => _delete(offer.id),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
