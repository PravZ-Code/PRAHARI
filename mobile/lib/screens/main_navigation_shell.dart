import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/dashboard_provider.dart';
import 'home_dashboard_screen.dart';
import 'stress_predictor_screen.dart';
import 'request_help_screen.dart';
import 'my_requests_screen.dart';
import 'profile_screen.dart';
import 'copilot_screen.dart';
import 'prahari_vani_screen.dart';
import 'airgap_sync_screen.dart';
import 'audit_ledger_screen.dart';
import 'buddy_check_screen.dart';

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  late final List<Widget> _personnelScreens;

  @override
  void initState() {
    super.initState();
    _personnelScreens = [
      HomeDashboardScreen(
        onNavigateToTab: (index) => setState(() => _currentIndex = index),
      ),
      const StressPredictorScreen(),
      RequestHelpScreen(
        onRequestSubmitted: () => setState(() => _currentIndex = 3), // Switch to My Requests
      ),
      const MyRequestsScreen(),
      const ProfileScreen(),
    ];
  }

  void _showUrgentSosDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, color: Color(0xFFEF4444)),
            SizedBox(width: 8),
            Text('Urgent Welfare SOS', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: const Text(
          'Initiate an immediate, high-priority welfare outreach request under Section 21 MHCA 2017? This guarantees a 4-hour welfare officer response time without punitive records.',
          style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.3),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<DashboardProvider>().triggerSos(
                'Urgent SOS assistance requested by personnel via PRAHARI mobile application.',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    content: Text(
                      success
                          ? 'Welfare Officer notified! High-priority 4h SLA active.'
                          : 'SOS request queued for offline sync.',
                    ),
                  ),
                );
              }
            },
            child: const Text('CONFIRM SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showFieldProtocolsMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 14),
              const Text(
                'TACTICAL FIELD SERVICES',
                style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1.2),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.shield, color: Color(0xFFEF4444)),
                title: const Text('Urgent Welfare SOS (4h SLA)', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Direct welfare officer escalation under Section 21 MHCA 2017', style: TextStyle(color: Colors.white60, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  _showUrgentSosDialog(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.smart_toy_outlined, color: Color(0xFF60A5FA)),
                title: const Text('Prahari Copilot (AI Sahayak)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Confidential AI Welfare, Rest, and 72h Leave Rules Assistant', style: TextStyle(color: Colors.white60, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const CopilotScreen()));
                },
              ),
              ListTile(
                leading: const Icon(Icons.phone_in_talk, color: Color(0xFF10B981)),
                title: const Text('Prahari Vani (2G Keypad Phone)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Zero-network IVR, *141# USSD, and SMS gateway', style: TextStyle(color: Colors.white60, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const PrahariVaniScreen()));
                },
              ),
              ListTile(
                leading: const Icon(Icons.usb, color: Color(0xFF60A5FA)),
                title: const Text('Offline & Air-Gap USB Sync', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Radio-silent FOB data sync via encrypted storage', style: TextStyle(color: Colors.white60, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AirgapSyncScreen()));
                },
              ),
              ListTile(
                leading: const Icon(Icons.people_outline, color: Color(0xFF38BDF8)),
                title: const Text('Anonymous Buddy Check', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Confidential peer support without stigmatization', style: TextStyle(color: Colors.white60, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const BuddyCheckScreen()));
                },
              ),
              ListTile(
                leading: const Icon(Icons.verified_user, color: Color(0xFFFBBF24)),
                title: const Text('Cryptographic Audit Ledger', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('SHA-256 chain verification & Court of Inquiry dossier', style: TextStyle(color: Colors.white60, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AuditLedgerScreen()));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      body: IndexedStack(
        index: _currentIndex,
        children: _personnelScreens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          border: Border(top: BorderSide(color: Color(0xFF1E293B), width: 1.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (idx) {
            if (idx == 5) {
              _showFieldProtocolsMenu(context);
            } else {
              setState(() => _currentIndex = idx);
            }
          },
          backgroundColor: const Color(0xFF0F172A),
          selectedItemColor: const Color(0xFF10B981),
          unselectedItemColor: Colors.white54,
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 10,
          unselectedFontSize: 10,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w800),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.favorite_outline),
              activeIcon: Icon(Icons.favorite),
              label: 'Wellbeing',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.add_circle_outline),
              activeIcon: Icon(Icons.add_circle),
              label: 'Request Help',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history_outlined),
              activeIcon: Icon(Icons.history),
              label: 'My Requests',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.more_horiz),
              label: 'More',
            ),
          ],
        ),
      ),
    );
  }
}
