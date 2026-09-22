import 'package:flutter/material.dart';

import '../../core/api/banner_service.dart';
import '../../core/api/area_service.dart';
import '../../core/widgets/banner_carousel.dart';
import '../../core/widgets/gradient_app_bar.dart';
import '../../models/area.dart';
import '../../models/promo_banner.dart';
import '../area/area_screen.dart';
import '../profile/profile_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  final _bannerService = BannerService();
  final _areaService = AreaService();
  List<PromoBanner> _banners = [];
  List<Area> _allAreas = [];
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
    final results = await Future.wait([_bannerService.list(), _areaService.list()]);
    if (!mounted) return;
    setState(() {
      _banners = results[0] as List<PromoBanner>;
      _allAreas = results[1] as List<Area>;
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final query = _query.trim().toLowerCase();
    final areas = query.isEmpty
        ? _allAreas
        : _allAreas.where((c) => c.name.toLowerCase().contains(query)).toList();

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
                hintText: 'Search areas...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: areas.isEmpty
                  ? LayoutBuilder(
                      builder: (context, constraints) => SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: SizedBox(
                          height: constraints.maxHeight,
                          child: const Center(child: Text('No matching areas')),
                        ),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 8,
                        childAspectRatio: 0.8,
                      ),
                      itemCount: areas.length,
                      itemBuilder: (context, index) {
                        final area = areas[index];
                        return InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => AreaScreen(area: area.name)),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircleAvatar(
                                radius: 28,
                                backgroundColor: scheme.surfaceContainerHighest,
                                child: Icon(Icons.location_city, color: scheme.primary),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                area.name,
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        );
                      },
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
