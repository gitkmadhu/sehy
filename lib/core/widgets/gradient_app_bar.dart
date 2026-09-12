import 'package:flutter/material.dart';

/// The colorful primary->tertiary gradient app bar used on every screen.
/// Title/subtitle are always the app brand ("GLML" / "Malls & Stores");
/// [pageName], if given, is shown as a label on the right end.
class GradientAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? pageName;
  final List<Widget>? actions;
  final bool automaticallyImplyLeading;
  final Widget? bottom;
  final double bottomHeight;

  const GradientAppBar({
    super.key,
    this.pageName,
    this.actions,
    this.automaticallyImplyLeading = true,
    this.bottom,
    this.bottomHeight = 0,
  });

  /// The fixed "GLML / Malls & Stores" brand title, reused by screens that
  /// build their own SliverAppBar (e.g. detail pages with a cover photo).
  static const Widget brandTitle = Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text('GLML', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.white)),
      Text('Malls & Stores', style: TextStyle(fontSize: 12, color: Colors.white70)),
    ],
  );

  /// The right-end page-name label, reused the same way as [brandTitle].
  static Widget pageNameLabel(String name) => Padding(
        padding: const EdgeInsets.only(right: 16),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 130),
          child: Text(
            name,
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ),
      );

  @override
  Size get preferredSize => Size.fromHeight(kToolbarHeight + bottomHeight);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      automaticallyImplyLeading: automaticallyImplyLeading,
      iconTheme: const IconThemeData(color: Colors.white),
      actionsIconTheme: const IconThemeData(color: Colors.white),
      flexibleSpace: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [scheme.primary, scheme.tertiary],
          ),
        ),
      ),
      title: brandTitle,
      actions: [
        if (pageName != null) pageNameLabel(pageName!),
        ...?actions,
      ],
      bottom: bottom == null
          ? null
          : PreferredSize(
              preferredSize: Size.fromHeight(bottomHeight),
              child: bottom!,
            ),
    );
  }
}
