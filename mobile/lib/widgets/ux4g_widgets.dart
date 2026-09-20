import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_locale_provider.dart';
import '../theme/ux4g_defense_theme.dart';

enum Ux4gBadgeType { success, warning, danger, info, neutral }
enum Ux4gButtonType { primary, secondary, outline, crisis }

/// Official UX4G Government Container Card with GIGW 3.0 border and elevation
class Ux4gCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final Color? accentColor;
  final VoidCallback? onTap;

  const Ux4gCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.margin = const EdgeInsets.symmetric(vertical: 6.0),
    this.accentColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;
    final colors = Theme.of(context).colorScheme;

    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(8.0),
        border: Border.all(
          color: colors.outline,
          width: 1.0,
        ),
        boxShadow: Ux4gDefenseTheme.elevationLevel1(isDark),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8.0),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (accentColor != null)
                Container(
                  width: 4.0,
                  color: accentColor,
                ),
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onTap,
                    child: Padding(
                      padding: padding,
                      child: child,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Official UX4G Semantic Status Badge
class Ux4gBadge extends StatelessWidget {
  final String text;
  final Ux4gBadgeType type;
  final IconData? icon;

  const Ux4gBadge({
    super.key,
    required this.text,
    this.type = Ux4gBadgeType.neutral,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeLocaleProvider>().isDark;
    Color bg;
    Color fg;
    Color border;

    switch (type) {
      case Ux4gBadgeType.success:
        bg = isDark ? Ux4gDefenseTheme.successSurfaceDark : Ux4gDefenseTheme.successSurfaceLight;
        fg = isDark ? Ux4gDefenseTheme.defenseGreenLight : Ux4gDefenseTheme.successTextLight;
        border = isDark ? Ux4gDefenseTheme.defenseGreenLight : const Color(0xFF86EFAC);
        break;
      case Ux4gBadgeType.warning:
        bg = isDark ? Ux4gDefenseTheme.warningSurfaceDark : Ux4gDefenseTheme.warningSurfaceLight;
        fg = isDark ? Ux4gDefenseTheme.tacticalAmberLight : Ux4gDefenseTheme.warningTextLight;
        border = isDark ? Ux4gDefenseTheme.tacticalAmberLight : const Color(0xFFFCD34D);
        break;
      case Ux4gBadgeType.danger:
        bg = isDark ? Ux4gDefenseTheme.errorSurfaceDark : Ux4gDefenseTheme.errorSurfaceLight;
        fg = isDark ? Ux4gDefenseTheme.crisisRedLight : Ux4gDefenseTheme.errorTextLight;
        border = isDark ? Ux4gDefenseTheme.crisisRedLight : const Color(0xFFFCA5A5);
        break;
      case Ux4gBadgeType.info:
        bg = isDark ? Ux4gDefenseTheme.infoSurfaceDark : Ux4gDefenseTheme.infoSurfaceLight;
        fg = isDark ? Ux4gDefenseTheme.infoBlueLight : Ux4gDefenseTheme.infoTextLight;
        border = isDark ? Ux4gDefenseTheme.infoBlueLight : const Color(0xFF7DD3FC);
        break;
      case Ux4gBadgeType.neutral:
        bg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
        fg = isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155);
        border = isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4.0),
        border: Border.all(color: border, width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12.0, color: fg),
            const SizedBox(width: 4.0),
          ],
          Text(
            text,
            style: TextStyle(
              color: fg,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Official UX4G Accessible Button
class Ux4gButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final Ux4gButtonType type;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;

  const Ux4gButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.type = Ux4gButtonType.primary,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    BorderSide border = BorderSide.none;

    switch (type) {
      case Ux4gButtonType.primary:
        bg = Theme.of(context).colorScheme.primary;
        fg = Theme.of(context).colorScheme.onPrimary;
        break;
      case Ux4gButtonType.secondary:
        bg = Ux4gDefenseTheme.indiaSaffron;
        fg = const Color(0xFF1E293B);
        break;
      case Ux4gButtonType.outline:
        bg = Colors.transparent;
        fg = Theme.of(context).colorScheme.primary;
        border = BorderSide(color: Theme.of(context).colorScheme.primary, width: 1.5);
        break;
      case Ux4gButtonType.crisis:
        bg = Ux4gDefenseTheme.crisisRed;
        fg = Colors.white;
        break;
    }

    final btnWidget = SizedBox(
      height: 44.0, // Minimum GIGW / WCAG touch target
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: fg,
          elevation: type == Ux4gButtonType.outline ? 0 : 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(6.0),
            side: border,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
        ),
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? SizedBox(
                height: 18.0,
                width: 18.0,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  valueColor: AlwaysStoppedAnimation<Color>(fg),
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 17.0, color: fg),
                    const SizedBox(width: 8.0),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      color: fg,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
      ),
    );

    return isFullWidth ? SizedBox(width: double.infinity, child: btnWidget) : btnWidget;
  }
}
