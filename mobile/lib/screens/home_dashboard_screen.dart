import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/local_db.dart';
import '../services/sync_queue.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/sos_dialog.dart';
import 'request_help_screen.dart';
import 'my_requests_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateToTab;

  const HomeDashboardScreen({super.key, this.onNavigateToTab});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  List<Map<String, dynamic>> _requests = [];
  Map<String, dynamic>? _cachedProfile;

  @override
  void initState() {
    super.initState();
    _loadLocalData();
  }

  Future<void> _loadLocalData() async {
    final db = LocalDb();
    final reqs = await db.getAllRequests();
    final prof = await db.getCachedProfile();

    if (mounted) {
      setState(() {
        _requests = reqs;
        _cachedProfile = prof;
      });
    }

    // Trigger non-blocking pull refresh
    SyncQueue().syncDown().then((_) async {
      final updatedReqs = await db.getAllRequests();
      final updatedProf = await db.getCachedProfile();
      if (mounted) {
        setState(() {
          _requests = updatedReqs;
          _cachedProfile = updatedProf;
        });
      }
    });
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'resolved':
        return Ux4gDefenseTheme.defenseGreen;
      case 'under_review':
      case 'partially_approved':
        return const Color(0xFF0284C7); // Tactical sky blue
      case 'fast_tracked':
        return Ux4gDefenseTheme.mhaNavy;
      case 'needs_more_info':
      case 'warning':
        return Ux4gDefenseTheme.tacticalAmber;
      default:
        return const Color(0xFF64748B); // Slate grey
    }
  }

  String _formatStatusLabel(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'resolved':
        return 'Approved';
      case 'under_review':
      case 'partially_approved':
        return 'Under review';
      case 'fast_tracked':
        return 'Fast-tracked (Emergency)';
      case 'needs_more_info':
        return 'Needs more info';
      case 'submitted':
      case 'filed':
      default:
        return 'Submitted';
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final syncQueue = context.watch<SyncQueue>();
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    final soldierName = auth.profile?.name ?? auth.user?.name ?? _cachedProfile?['name'] ?? 'Trooper';
    final serviceNo = auth.profile?.serviceNumber ?? auth.user?.serviceNumber ?? _cachedProfile?['service_number'] ?? 'CRPF-84012';
    final unitName = auth.profile?.unitName ?? auth.user?.unitName ?? _cachedProfile?['unit_name'] ?? 'Alpha Company';
    final restStatus = _cachedProfile?['rest_status'] ?? 'Rest compliant';
    final statusLabel = _cachedProfile?['status_label'] ?? 'On track';

    // Active requests (not approved/resolved)
    final activeRequests = _requests
        .where((r) => r['status'] != 'approved' && r['status'] != 'resolved' && r['status'] != 'rejected')
        .take(3)
        .toList();

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadLocalData,
          color: Ux4gDefenseTheme.mhaNavy,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Trooper Card with Quiet Status
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Ux4gDefenseTheme.mhaNavy.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            soldierName.isNotEmpty ? soldierName[0].toUpperCase() : 'T',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Ux4gDefenseTheme.mhaNavy,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              soldierName,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$serviceNo • $unitName',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // SOS quick trigger
                      IconButton(
                        tooltip: 'Immediate Help / SOS',
                        icon: const Icon(Icons.support_agent_rounded, color: Ux4gDefenseTheme.mhaNavy, size: 28),
                        onPressed: () => SosDialog.show(context),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // Offline sync badge if pending
                if (syncQueue.pendingCount > 0 || syncQueue.isOffline)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          syncQueue.isOffline ? Icons.cloud_off : Icons.sync,
                          size: 16,
                          color: const Color(0xFF93C5FD),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            syncQueue.statusMessage,
                            style: const TextStyle(fontSize: 12, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),

                // ELEMENT 1: BIG PRIMARY BUTTON "ASK FOR HELP" (Largest Element)
                SizedBox(
                  height: 74,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => RequestHelpScreen(
                            onRequestSubmitted: _loadLocalData,
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Ux4gDefenseTheme.mhaNavy,
                      foregroundColor: Colors.white,
                      elevation: 3,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.handshake_rounded, size: 30, color: Colors.white),
                        ),
                        const SizedBox(width: 14),
                        const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'ASK FOR HELP',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                            Text(
                              'Leave • Emergency • Support • Talk',
                              style: TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                          ],
                        ),
                        const Spacer(),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 20, color: Colors.white70),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // ELEMENT 3: SMALL, QUIET STATUS LINE (Never a number, never red)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle_outline_rounded,
                        size: 18,
                        color: Ux4gDefenseTheme.defenseGreen,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Rest status: $statusLabel ($restStatus)',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : const Color(0xFF334155),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // ELEMENT 2: MY CURRENT REQUESTS (Short list with clear status)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'MY CURRENT REQUESTS',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.6,
                      ),
                    ),
                    if (_requests.isNotEmpty)
                      TextButton(
                        onPressed: () {
                          if (widget.onNavigateToTab != null) {
                            widget.onNavigateToTab!(1); // Go to requests tab
                          } else {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const MyRequestsScreen()),
                            );
                          }
                        },
                        child: const Text('View All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                if (activeRequests.isEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.inbox_outlined, size: 36, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          const Text(
                            'No active requests',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'If you need leave or support, tap Ask for Help above.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...activeRequests.map((req) {
                    final status = req['status']?.toString() ?? 'submitted';
                    final statusColor = _getStatusColor(status);
                    final hoursRem = (req['sla_hours_remaining'] as num?)?.toDouble() ?? 72.0;
                    final category = req['category']?.toString() ?? 'Support Request';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  category.replaceAll('_', ' ').toUpperCase(),
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  _formatStatusLabel(status),
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.bold,
                                    color: statusColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (req['description']?.toString().isNotEmpty == true) ...[
                            const SizedBox(height: 6),
                            Text(
                              req['description'].toString(),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? Colors.white70 : Colors.black87,
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              const Icon(Icons.timer_outlined, size: 14, color: Colors.grey),
                              const SizedBox(width: 4),
                              Text(
                                '${hoursRem.toStringAsFixed(0)} hours remaining on response',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                              const Spacer(),
                              if (req['sync_status'] == 'PENDING_SYNC')
                                const Row(
                                  children: [
                                    Icon(Icons.cloud_upload_outlined, size: 14, color: Color(0xFF93C5FD)),
                                    SizedBox(width: 4),
                                    Text('Saved on phone', style: TextStyle(fontSize: 11, color: Color(0xFF93C5FD))),
                                  ],
                                ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
