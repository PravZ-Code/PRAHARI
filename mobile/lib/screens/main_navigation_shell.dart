import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/sync_queue.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/government_header_bar.dart';
import '../widgets/sos_dialog.dart';

import 'home_dashboard_screen.dart';
import 'my_requests_screen.dart';
import 'assessment_screen.dart';
import 'buddy_check_screen.dart';
import 'profile_screen.dart';

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      HomeDashboardScreen(
        onNavigateToTab: (index) => setState(() => _currentIndex = index),
      ),
      const MyRequestsScreen(),
      const AssessmentScreen(),
      const BuddyCheckScreen(),
      const ProfileScreen(),
    ];

    // Initialize sync queue
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SyncQueue>().init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    return Scaffold(
      appBar: const GovernmentHeaderBar(
        showControls: true,
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => SosDialog.show(context),
        backgroundColor: const Color(0xFFDC2626), // Emergency red
        foregroundColor: Colors.white,
        elevation: 4,
        icon: const Icon(Icons.support_agent_rounded, size: 22),
        label: const Text(
          'HELP / SOS',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 0.6),
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              width: 1.0,
            ),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
          backgroundColor: isDark ? Ux4gDefenseTheme.surfaceDark : Colors.white,
          indicatorColor: Ux4gDefenseTheme.mhaNavy.withValues(alpha: 0.15),
          height: 66,
          elevation: 2,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded, color: Ux4gDefenseTheme.mhaNavy),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment_rounded, color: Ux4gDefenseTheme.mhaNavy),
              label: 'Requests',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_border_rounded),
              selectedIcon: Icon(Icons.favorite_rounded, color: Ux4gDefenseTheme.mhaNavy),
              label: 'Check-In',
            ),
            NavigationDestination(
              icon: Icon(Icons.people_outline_rounded),
              selectedIcon: Icon(Icons.people_rounded, color: Ux4gDefenseTheme.mhaNavy),
              label: 'Buddy Check',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded, color: Ux4gDefenseTheme.mhaNavy),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
