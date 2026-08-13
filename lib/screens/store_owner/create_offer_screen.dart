import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/api/offer_service.dart';

class CreateOfferScreen extends StatefulWidget {
  final int storeId;

  const CreateOfferScreen({super.key, required this.storeId});

  @override
  State<CreateOfferScreen> createState() => _CreateOfferScreenState();
}

class _CreateOfferScreenState extends State<CreateOfferScreen> {
  final _formKey = GlobalKey<FormState>();
  final _offerService = OfferService();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _originalPrice = TextEditingController();
  final _discountedPrice = TextEditingController();
  final _discountPercent = TextEditingController();

  DateTime? _expiresAt;
  XFile? _image;
  bool _submitting = false;

  Future<void> _pickImage() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked != null) setState(() => _image = picked);
  }

  Future<void> _pickExpiry() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) setState(() => _expiresAt = date);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_expiresAt == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick an expiry date')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await _offerService.create(
        storeId: widget.storeId,
        title: _title.text.trim(),
        expiresAt: _expiresAt!,
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
        originalPrice: double.tryParse(_originalPrice.text),
        discountedPrice: double.tryParse(_discountedPrice.text),
        discountPercent: int.tryParse(_discountPercent.text),
        imagePath: _image?.path,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Offer')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GestureDetector(
                onTap: _pickImage,
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                      image: _image == null
                          ? null
                          : DecorationImage(image: FileImage(File(_image!.path)), fit: BoxFit.cover),
                    ),
                    child: _image == null
                        ? const Center(child: Icon(Icons.add_photo_alternate_outlined, size: 36))
                        : null,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Offer title'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _description,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _originalPrice,
                      decoration: const InputDecoration(labelText: 'Original price'),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _discountedPrice,
                      decoration: const InputDecoration(labelText: 'Discounted price'),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _discountPercent,
                decoration: const InputDecoration(labelText: 'Discount %'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(_expiresAt == null
                    ? 'Set expiry date'
                    : 'Expires ${DateFormat.yMMMd().format(_expiresAt!)}'),
                trailing: const Icon(Icons.calendar_today_outlined),
                onTap: _pickExpiry,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Submit for review'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
