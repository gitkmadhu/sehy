import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/api/banner_service.dart';
import '../../core/api/home_section_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/home_section.dart';
import '../../models/promo_banner.dart';
import '../area/category_detail_screen.dart';
import '../services/service_detail_screen.dart';
import '../units/unit_screen.dart';
import '../profile/profile_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  final _bannerService = BannerService();
  final _homeSectionService = HomeSectionService();
  List<HomeSection> _sections = [];
  List<PromoBanner> _banners = [];
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  Future<void> _load() async {
    final results = await Future.wait([
      _bannerService.list(),
      _homeSectionService.list(),
    ]);
    if (!mounted) return;
    setState(() {
      _banners = results[0] as List<PromoBanner>;
      _sections = results[1] as List<HomeSection>;
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final query = _query.trim().toLowerCase();
    final sections = query.isEmpty
        ? _sections
        : [
            for (final section in _sections)
              HomeSection(
                categoryId: section.categoryId,
                title: section.title,
                units: section.units.where((u) => u.name.toLowerCase().contains(query)).toList(),
                services: section.services.where((s) => s.name.toLowerCase().contains(query)).toList(),
              ),
          ].where((s) => s.units.isNotEmpty || s.services.isNotEmpty).toList();

    return Scaffold(
      appBar: const GradientAppBar(automaticallyImplyLeading: false),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: _banners.isNotEmpty
                ? BannerCarousel(banners: _banners)
                : _DummyBanner(scheme: scheme),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search units and shops...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (sections.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child: Center(child: Text('Nothing to show yet')),
                    ),
                  for (final section in sections) _HomeSectionRow(section: section),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.small(
        shape: const CircleBorder(),
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const ProfileScreen()),
        ),
        child: const Icon(Icons.person),
      ),
    );
  }
}

class _DummyBanner extends StatelessWidget {
  final ColorScheme scheme;

  const _DummyBanner({required this.scheme});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 7,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [scheme.primary, scheme.tertiary]),
            ),
            child: const Center(
              child: Text(
                'Your banner here',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeSectionRow extends StatelessWidget {
  final HomeSection section;

  const _HomeSectionRow({required this.section});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final items = <Widget>[
      for (final unit in section.units)
        _HomeCard(
          title: unit.name,
          subtitle: '${unit.serviceCount} ${unit.serviceCount == 1 ? 'shop' : 'shops'}',
          logoUrl: unit.logoUrl,
          icon: Icons.apartment,
          scheme: scheme,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => UnitScreen(unitId: unit.id)),
          ),
        ),
      for (final service in section.services)
        _HomeCard(
          title: service.name,
          logoUrl: service.logoUrl,
          icon: Icons.storefront,
          scheme: scheme,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ServiceDetailScreen(serviceId: service.id)),
          ),
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
          child: Row(
            children: [
              Expanded(
                child: Text(section.title, style: Theme.of(context).textTheme.titleMedium),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => CategoryDetailScreen(categoryId: section.categoryId)),
                ),
                child: const Text('View all'),
              ),
            ],
          ),
        ),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text('Nothing listed in this category yet'),
          )
        else
          SizedBox(
            height: 124,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) => items[index],
            ),
          ),
      ],
    );
  }
}

class _HomeCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? logoUrl;
  final IconData icon;
  final ColorScheme scheme;
  final VoidCallback onTap;

  const _HomeCard({
    required this.title,
    required this.icon,
    required this.scheme,
    required this.onTap,
    this.subtitle,
    this.logoUrl,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: SizedBox(
        width: 92,
        child: Column(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: scheme.surfaceContainerHighest,
              backgroundImage: logoUrl == null ? null : CachedNetworkImageProvider(logoUrl!),
              child: logoUrl == null ? Icon(icon, color: scheme.primary) : null,
            ),
            const SizedBox(height: 6),
            Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (subtitle != null)
              Text(
                subtitle!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall,
              ),
          ],
        ),
      ),
    );
  }
}
