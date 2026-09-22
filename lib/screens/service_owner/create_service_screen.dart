import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/area_service.dart';
import '../../core/api/category_service.dart';
import '../../core/api/service_api.dart';
import '../../core/api/tag_service.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/area.dart';
import '../../models/category.dart';
import '../../models/tag.dart';
import 'service_owner_home_screen.dart';

/// The "upload your profile" form for a service_owner — creates their first
/// (or next) service listing under a category/area, via services/create.php.
/// Reached right after registering as a business, or from
/// ServiceOwnerHomeScreen's "Add a listing" action.
class CreateServiceScreen extends StatefulWidget {
  final String? initialArea;

  const CreateServiceScreen({super.key, this.initialArea});

  @override
  State<CreateServiceScreen> createState() => _CreateServiceScreenState();
}

class _CreateServiceScreenState extends State<CreateServiceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _description = TextEditingController();
  final _address = TextEditingController();
  final _gstin = TextEditingController();
  final _pan = TextEditingController();

  final _serviceApi = ServiceApi();
  final _areaService = AreaService();
  final _categoryService = CategoryService();
  final _tagService = TagService();

  List<Area> _areas = [];
  List<Category> _categories = [];
  List<Tag> _tags = [];
  Area? _selectedArea;
  Category? _selectedCategory;
  Tag? _selectedTag;

  final _picker = ImagePicker();
  XFile? _logo;
  XFile? _cover;
  XFile? _allocationProof;

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _areaService.list().then((v) {
      if (!mounted) return;
      setState(() {
        _areas = v;
        _selectedArea = v.where((a) => a.name == widget.initialArea).firstOrNull;
      });
    });
    _categoryService.list().then((v) => mounted ? setState(() => _categories = v) : null);
    _tagService.list().then((v) => mounted ? setState(() => _tags = v) : null);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _description.dispose();
    _address.dispose();
    _gstin.dispose();
    _pan.dispose();
    super.dispose();
  }

  Future<void> _pickImage(void Function(XFile) onPicked) async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (file != null) setState(() => onPicked(file));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_logo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add a logo/photo for your listing')),
      );
      return;
    }
    if (_gstin.text.trim().isEmpty && _pan.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your GSTIN or PAN (at least one is required)')),
      );
      return;
    }
    if (_allocationProof == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Upload proof of your business address (photo or PDF)')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await _serviceApi.create(
        name: _name.text.trim(),
        email: _email.text.trim(),
        phone: _phone.text.trim(),
        description: _description.text.trim(),
        address: _address.text.trim(),
        area: _selectedArea?.name,
        categoryId: _selectedCategory?.id,
        tagId: _selectedTag?.id,
        gstin: _gstin.text.trim(),
        pan: _pan.text.trim(),
        logoPath: _logo!.path,
        coverPath: _cover?.path,
        allocationProofPath: _allocationProof!.path,
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Submitted for review'),
          content: const Text(
            "Your listing has been submitted and will go live once approved. You'll see it here once it's live.",
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('OK')),
          ],
        ),
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const ServiceOwnerHomeScreen()),
        (route) => false,
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      if (e.statusCode == 402) {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Listing fee required'),
            content: Text(
              '${e.message}\n\nOnline payment for the one-time listing fee isn\'t available in the '
              'app yet — please contact support to arrange payment, then come back and submit again.',
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('OK')),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const GradientAppBar(pageName: 'List your business'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _ImagePickerTile(
                  label: 'Logo / main photo *',
                  file: _logo,
                  onTap: () => _pickImage((f) => _logo = f),
                ),
                const SizedBox(height: 12),
                _ImagePickerTile(
                  label: 'Cover photo (optional)',
                  file: _cover,
                  onTap: () => _pickImage((f) => _cover = f),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Business name'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter a name' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Contact email'),
                  validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _description,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _address,
                  decoration: const InputDecoration(labelText: 'Address'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<Area>(
                  initialValue: _selectedArea,
                  decoration: const InputDecoration(labelText: 'Area'),
                  items: _areas.map((a) => DropdownMenuItem(value: a, child: Text(a.name))).toList(),
                  onChanged: (v) => setState(() => _selectedArea = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<Category>(
                  initialValue: _selectedCategory,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c.name))).toList(),
                  onChanged: (v) => setState(() => _selectedCategory = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<Tag>(
                  initialValue: _selectedTag,
                  decoration: const InputDecoration(labelText: 'Tag (business type)'),
                  items: _tags.map((t) => DropdownMenuItem(value: t, child: Text(t.name))).toList(),
                  onChanged: (v) => setState(() => _selectedTag = v),
                ),
                const SizedBox(height: 20),
                Text('Verification', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 4),
                const Text(
                  'At least one of GSTIN or PAN is required, plus a document proving your business address.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _gstin,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(labelText: 'GSTIN'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _pan,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(labelText: 'PAN'),
                ),
                const SizedBox(height: 12),
                _ImagePickerTile(
                  label: 'Address proof (photo) *',
                  file: _allocationProof,
                  onTap: () => _pickImage((f) => _allocationProof = f),
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
      ),
    );
  }
}

class _ImagePickerTile extends StatelessWidget {
  final String label;
  final XFile? file;
  final VoidCallback onTap;

  const _ImagePickerTile({required this.label, required this.file, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(file == null ? Icons.add_a_photo_outlined : Icons.check_circle, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(file == null ? label : '${file!.name} selected')),
          ],
        ),
      ),
    );
  }
}
