import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/area_service.dart';
import '../../core/api/contact_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/area.dart';
import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';

class ContactUsScreen extends StatefulWidget {
  const ContactUsScreen({super.key});

  @override
  State<ContactUsScreen> createState() => _ContactUsScreenState();
}

class _ContactUsScreenState extends State<ContactUsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _contactService = ContactService();
  final _areaService = AreaService();
  final _description = TextEditingController();
  List<Area> _areas = [];
  String? _queryType;
  String? _area;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _areaService.list().then((c) => setState(() => _areas = c));
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await _contactService.create(
        queryType: _queryType!,
        area: _area,
        description: _description.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text("Thanks! We'll get back to you soon.")));
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (!mounted) return;
      final message = e.toString();
      if (message.contains('bearer token') || message.contains('Invalid or expired token')) {
        // The session token is missing/stale — send the user to sign in again
        // rather than showing a confusing backend error string.
        await context.read<AuthProvider>().logout();
        if (!mounted) return;
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Please sign in again to continue.')));
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => route.isFirst,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const GradientAppBar(pageName: 'Contact Us'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _queryType,
                decoration: const InputDecoration(labelText: 'What is this about?'),
                items: contactQueryTypes
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (v) => setState(() => _queryType = v),
                validator: (v) => v == null ? 'Select a query type' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _area,
                decoration: const InputDecoration(labelText: 'Area (optional)'),
                items: _areas
                    .map((c) => DropdownMenuItem(value: c.name, child: Text(c.name)))
                    .toList(),
                onChanged: (v) => setState(() => _area = v),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _description,
                decoration: const InputDecoration(labelText: 'Tell us more'),
                maxLines: 6,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Submit'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
