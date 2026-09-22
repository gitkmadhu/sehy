import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/area_service.dart';
import '../../core/api/category_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/area.dart';
import '../../models/category.dart';
import '../../providers/auth_provider.dart';
import '../service_owner/create_service_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _submitting = false;
  bool _obscurePassword = true;

  // Every shopper registration also doubles as "list your business" — picking
  // an area/category is optional (services/create.php lets a service_owner
  // set/change these later), just a head start for the profile screen next.
  bool _listingBusiness = false;
  final _areaService = AreaService();
  final _categoryService = CategoryService();
  List<Area> _areas = [];
  List<Category> _categories = [];
  Area? _selectedArea;
  Category? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _areaService.list().then((v) => mounted ? setState(() => _areas = v) : null);
    _categoryService.list().then((v) => mounted ? setState(() => _categories = v) : null);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final outcome = await context.read<AuthProvider>().register(
          name: _name.text.trim(),
          email: _email.text.trim(),
          phone: _phone.text.trim(),
          password: _password.text,
          role: _listingBusiness ? 'service_owner' : 'shopper',
          categoryId: _listingBusiness ? _selectedCategory?.id : null,
        );
    if (!mounted) return;
    setState(() => _submitting = false);

    final message = context.read<AuthProvider>().error;
    switch (outcome) {
      case RegisterOutcome.success:
        if (_listingBusiness) {
          // Skip straight to filling in the service profile while the
          // account is fresh, instead of landing on the (currently empty)
          // messages inbox — mirrors LoginScreen's reset-the-stack pattern
          // for category_manager/service_owner sign-ins.
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => CreateServiceScreen(initialArea: _selectedArea?.name)),
            (route) => false,
          );
          break;
        }
        // Pop Register, then the Login screen beneath it, landing back on
        // whatever pushed Login (normally Profile) rather than jumping Home.
        final navigator = Navigator.of(context);
        navigator.pop();
        if (navigator.canPop()) navigator.pop();
        break;
      case RegisterOutcome.pending:
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Submitted for approval'),
            content: Text(message ?? 'Your account has been submitted for admin approval.'),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('OK')),
            ],
          ),
        );
        if (mounted) Navigator.of(context).pop();
        break;
      case RegisterOutcome.failed:
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message ?? 'Registration failed')));
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const GradientAppBar(pageName: 'Create account'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: false, label: Text('Shopper'), icon: Icon(Icons.shopping_bag_outlined)),
                    ButtonSegment(value: true, label: Text('List my business'), icon: Icon(Icons.storefront_outlined)),
                  ],
                  selected: {_listingBusiness},
                  onSelectionChanged: (v) => setState(() => _listingBusiness = v.first),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _name,
                  decoration: InputDecoration(labelText: _listingBusiness ? 'Your name' : 'Full name'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your name' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Mobile number'),
                  validator: (v) => (v == null || v.trim().length < 10) ? 'Enter a valid mobile number' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (v) => (v == null || v.length < 6) ? 'Minimum 6 characters' : null,
                ),
                if (_listingBusiness) ...[
                  const SizedBox(height: 12),
                  const Text(
                    "You'll fill in your service profile (photos, address, etc.) right after this.",
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<Area>(
                    initialValue: _selectedArea,
                    decoration: const InputDecoration(labelText: 'Area (optional)'),
                    items: _areas
                        .map((a) => DropdownMenuItem(value: a, child: Text(a.name)))
                        .toList(),
                    onChanged: (v) => setState(() => _selectedArea = v),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<Category>(
                    initialValue: _selectedCategory,
                    decoration: const InputDecoration(labelText: 'Category (optional)'),
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c.name)))
                        .toList(),
                    onChanged: (v) => setState(() => _selectedCategory = v),
                  ),
                ],
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(
                          height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Create account'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
