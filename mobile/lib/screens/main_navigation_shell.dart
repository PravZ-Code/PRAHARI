import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/government_header_bar.dart';
import '../widgets/ux4g_widgets.dart';

import 'home_dashboard_screen.dart';
import 'duty_roster_screen.dart';
import 'request_help_screen.dart';
import 'stress_predictor_screen.dart';
import 'profile_screen.dart';

import 'buddy_check_screen.dart';
import 'assessment_screen.dart';
import 'prahari_vani_screen.dart';
import 'copilot_screen.dart';
import 'audit_ledger_screen.dart';
import 'airgap_sync_screen.dart';

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
      const DutyRosterScreen(),
      RequestHelpScreen(
        onRequestSubmitted: () => setState(() => _currentIndex = 0),
      ),
      const StressPredictorScreen(),
      const ProfileScreen(),
    ];
  }

  void _showUrgentSosDialog(BuildContext context) {
    final themeLocale = context.read<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? Ux4gDefenseTheme.surfaceDark : Colors.white,
        title: Row(
          children: const [
            Icon(Icons.warning_amber_rounded, color: Ux4gDefenseTheme.crisisRed, size: 24.0),
            SizedBox(width: 8.0),
            Text(
              '12-Hour Urgent Welfare SOS',
              style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: const Text(
          'Initiate an immediate, high-priority emergency welfare request under Section 21 of the Mental Healthcare Act 2017? '
          'This bypasses normal administrative queues and mandates a 12-hour resolution SLA with zero punitive records.',
          style: TextStyle(fontSize: 13.0, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Ux4gDefenseTheme.crisisRed,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<DashboardProvider>().triggerSos(
                'Urgent SOS assistance requested by personnel via PRAHARI mobile application.',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: success ? Ux4gDefenseTheme.defenseGreen : Ux4gDefenseTheme.crisisRed,
                    content: Text(
                      success
                          ? 'Welfare Officer and Company Commander notified! 12h emergency SLA active.'
                          : 'SOS request queued locally for automatic offline synchronization.',
                    ),
                  ),
                );
              }
            },
            child: const Text('CONFIRM EMERGENCY SOS', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final auth = context.watch<AuthProvider>();
    final isDark = themeLocale.isDark;

    return Scaffold(
      appBar: GovernmentHeaderBar(
        showControls: true,
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white, size: 22.0),
            tooltip: 'Open Tactical Services Menu',
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
      ),
      drawer: Drawer(
        backgroundColor: isDark ? Ux4gDefenseTheme.surfaceDark : Colors.white,
        child: SafeArea(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              // Government Drawer Header
              Container(
                padding: const EdgeInsets.all(20.0),
                color: isDark ? const Color(0xFF0F172A) : Ux4gDefenseTheme.mhaNavy,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6.0),
                          child: Image.asset(
                            'assets/images/prahari_logo.png',
                            height: 48.0,
                            width: 48.0,
                            errorBuilder: (ctx, err, stack) => const Icon(Icons.shield, size: 40.0, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                auth.profile?.rank != null
                                    ? '${auth.profile?.rank} ${auth.profile?.name}'
                                    : (auth.user?.rank != null
                                        ? '${auth.user?.rank} ${auth.user?.name}'
                                        : 'Trooper ${auth.user?.name ?? "Rajesh Kumar"}'),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2.0),
                              Text(
                                'Service No: ${auth.profile?.serviceNumber ?? auth.user?.serviceNumber ?? "GD-10492"}',
                                style: const TextStyle(
                                  color: Color(0xFFCBD5E1),
                                  fontSize: 11.0,
                                ),
                              ),
                              Text(
                                'Unit: ${auth.profile?.unitName ?? auth.user?.unitName ?? "Alpha Company, 79 Bn"}',
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 10.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8.0),

              ListTile(
                leading: const Icon(Icons.emergency_share_outlined, color: Ux4gDefenseTheme.crisisRed),
                title: const Text('12h Urgent Welfare SOS', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                subtitle: const Text('Bypass queues with fast-tracked statutory SLA', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  _showUrgentSosDialog(context);
                },
              ),

              const Divider(),

              ListTile(
                leading: const Icon(Icons.group_outlined, color: Ux4gDefenseTheme.mhaNavy),
                title: const Text('Peer Buddy Check', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                subtitle: const Text('Confidential buddy check-in observations', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const BuddyCheckScreen()));
                },
              ),

              ListTile(
                leading: const Icon(Icons.quiz_outlined, color: Ux4gDefenseTheme.mhaNavy),
                title: const Text('Clinical Assessments', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                subtitle: const Text('Standardized PHQ-9 & GAD-7 evaluations', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AssessmentScreen()));
                },
              ),

              ListTile(
                leading: const Icon(Icons.phone_in_talk_outlined, color: Ux4gDefenseTheme.mhaNavy),
                title: const Text('Prahari Vani IVR Keypad', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                subtitle: const Text('DTMF telephone helpline simulator', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const PrahariVaniScreen()));
                },
              ),

              ListTile(
                leading: const Icon(Icons.smart_toy_outlined, color: Ux4gDefenseTheme.mhaNavy),
                title: const Text('AI Tactical Copilot', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                subtitle: const Text('Air-gapped confidential welfare guide', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const CopilotScreen()));
                },
              ),

              ListTile(
                leading: const Icon(Icons.lock_clock_outlined, color: Ux4gDefenseTheme.mhaNavy),
                title: const Text('Audit Ledger Inspector', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                subtitle: const Text('Cryptographic SHA-256 chain verification', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AuditLedgerScreen()));
                },
              ),

              ListTile(
                leading: const Icon(Icons.sync_alt_outlined, color: Ux4gDefenseTheme.mhaNavy),
                title: const Text('Air-Gap USB Sync', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                subtitle: const Text('Physical bundle transfer for remote posts', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AirgapSyncScreen()));
                },
              ),

              const Divider(),

              ListTile(
                leading: const Icon(Icons.support_agent_outlined, color: Color(0xFF1D4ED8)),
                title: const Text('Tele-MANAS (14416)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                subtitle: const Text('National 24x7 statutory helpline', style: TextStyle(fontSize: 11.0)),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: Color(0xFF1D4ED8),
                      content: Text('National Tele-MANAS: Dial 14416 or 1800-891-4416 (Statutory 24x7 Support)'),
                    ),
                  );
                },
              ),

              const SizedBox(height: 12.0),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Ux4gButton(
                  label: 'Sign Out Session',
                  icon: Icons.logout,
                  type: Ux4gButtonType.outline,
                  onPressed: () async {
                    Navigator.pop(context);
                    await auth.logout();
                  },
                ),
              ),

              const SizedBox(height: 16.0),
            ],
          ),
        ),
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F172A) : Colors.white,
          border: Border(
            top: BorderSide(
              color: isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight,
              width: 1.0,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 8.0,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: isDark ? const Color(0xFF60A5FA) : Ux4gDefenseTheme.mhaNavy,
          unselectedItemColor: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11.0),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 10.5),
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.dashboard_outlined),
              activeIcon: const Icon(Icons.dashboard),
              label: themeLocale.tr('dashboard'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.calendar_month_outlined),
              activeIcon: const Icon(Icons.calendar_month),
              label: themeLocale.tr('duty_roster'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.assignment_add),
              activeIcon: const Icon(Icons.assignment),
              label: themeLocale.tr('leave_desk'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.insights_outlined),
              activeIcon: const Icon(Icons.insights),
              label: themeLocale.tr('welfare_health'),
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.person_outline),
              activeIcon: const Icon(Icons.person),
              label: themeLocale.tr('profile_audit'),
            ),
          ],
        ),
      ),
    );
  }
}
