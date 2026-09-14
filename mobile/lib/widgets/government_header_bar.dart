import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_locale_provider.dart';
import '../theme/ux4g_defense_theme.dart';

/// Official GIGW 3.0 Government Header Bar
/// Displays Tricolor strip, MHA / CRPF institutional branding, trilingual switcher,
/// font resizers (A-, A, A+), and high-contrast theme toggles.
class GovernmentHeaderBar extends StatelessWidget implements PreferredSizeWidget {
  final bool showControls;
  final Widget? leading;
  final List<Widget>? actions;

  const GovernmentHeaderBar({
    super.key,
    this.showControls = true,
    this.leading,
    this.actions,
  });

  @override
  Size get preferredSize => const Size.fromHeight(74.0);

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // GIGW 3.0 National Tricolor Identity Strip
        const TricolorBar(height: 4.0),

        // Institutional Header Strip
        Container(
          height: 70.0,
          padding: const EdgeInsets.symmetric(horizontal: 12.0),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0F172A) : Ux4gDefenseTheme.mhaNavy,
            border: Border(
              bottom: BorderSide(
                color: isDark ? Ux4gDefenseTheme.borderDark : const Color(0x33FFFFFF),
                width: 1.0,
              ),
            ),
          ),
          child: Row(
            children: [
              if (leading != null) leading!,

              // Official PRAHARI Crest / Emblem
              ClipRRect(
                borderRadius: BorderRadius.circular(4.0),
                child: Image.asset(
                  'assets/images/prahari_logo.png',
                  height: 38.0,
                  width: 38.0,
                  errorBuilder: (ctx, err, stack) => Container(
                    height: 38.0,
                    width: 38.0,
                    decoration: BoxDecoration(
                      color: Ux4gDefenseTheme.indiaSaffron,
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                    child: const Icon(Icons.shield, color: Colors.white, size: 24.0),
                  ),
                ),
              ),

              const SizedBox(width: 10.0),

              // Title and Department Details
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      themeLocale.tr('app_title'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15.0,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 1.0),
                    Text(
                      '${themeLocale.tr('mha_header')} | ${themeLocale.tr('crpf_header')}',
                      style: const TextStyle(
                        color: Color(0xFFCBD5E1),
                        fontSize: 10.5,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              if (actions != null) ...actions!,

              if (showControls) ...[
                // Language Switcher Dropdown (EN, HI, TA)
                Container(
                  height: 30.0,
                  padding: const EdgeInsets.symmetric(horizontal: 6.0),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4.0),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: themeLocale.currentLocale,
                      dropdownColor: isDark ? const Color(0xFF1E293B) : Ux4gDefenseTheme.mhaNavy,
                      icon: const Icon(Icons.arrow_drop_down, color: Colors.white, size: 16.0),
                      items: const [
                        DropdownMenuItem(
                          value: 'en',
                          child: Text('EN', style: TextStyle(color: Colors.white, fontSize: 11.0, fontWeight: FontWeight.bold)),
                        ),
                        DropdownMenuItem(
                          value: 'hi',
                          child: Text('हि', style: TextStyle(color: Colors.white, fontSize: 11.0, fontWeight: FontWeight.bold)),
                        ),
                        DropdownMenuItem(
                          value: 'ta',
                          child: Text('த', style: TextStyle(color: Colors.white, fontSize: 11.0, fontWeight: FontWeight.bold)),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) themeLocale.setLocale(val);
                      },
                    ),
                  ),
                ),

                const SizedBox(width: 6.0),

                // Font Resizer (A-, A, A+) per GIGW 3.0
                PopupMenuButton<double>(
                  tooltip: 'Text Size',
                  padding: EdgeInsets.zero,
                  icon: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 4.0),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(4.0),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: const Text('A', style: TextStyle(color: Colors.white, fontSize: 12.0, fontWeight: FontWeight.bold)),
                  ),
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  onSelected: (scale) => themeLocale.setFontScale(scale),
                  itemBuilder: (ctx) => [
                    PopupMenuItem(
                      value: 0.9,
                      child: Text('A- Small (90%)', style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 13.0)),
                    ),
                    PopupMenuItem(
                      value: 1.0,
                      child: Text('A Standard (100%)', style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 13.0, fontWeight: FontWeight.bold)),
                    ),
                    PopupMenuItem(
                      value: 1.15,
                      child: Text('A+ Large (115%)', style: TextStyle(color: isDark ? Colors.white : Colors.black87, fontSize: 13.0)),
                    ),
                  ],
                ),

                const SizedBox(width: 6.0),

                // Theme Mode Toggle (Light / Dark)
                IconButton(
                  tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                  icon: Icon(
                    isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                    color: Colors.white,
                    size: 19.0,
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32.0, minHeight: 32.0),
                  onPressed: () => themeLocale.toggleTheme(),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
