import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/local_db.dart';
import '../services/sync_queue.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/sos_dialog.dart';
import 'request_help_screen.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  List<Map<String, dynamic>> _requests = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    setState(() => _isLoading = true);
    final reqs = await LocalDb().getAllRequests();
    if (mounted) {
      setState(() {
        _requests = reqs;
        _isLoading = false;
      });
    }

    // Refresh from server in background
    SyncQueue().syncDown().then((_) async {
      final updated = await LocalDb().getAllRequests();
      if (mounted) {
        setState(() => _requests = updated);
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
        return const Color(0xFF0284C7);
      case 'fast_tracked':
        return Ux4gDefenseTheme.mhaNavy;
      case 'needs_more_info':
      case 'warning':
        return Ux4gDefenseTheme.tacticalAmber;
      case 'rejected':
        return const Color(0xFF64748B);
      default:
        return const Color(0xFF64748B);
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
      case 'rejected':
        return 'Not approved (Mission priority)';
      case 'submitted':
      case 'filed':
      default:
        return 'Submitted';
    }
  }

  String _getEscalationTierName(int level) {
    switch (level) {
      case 1:
        return 'Battalion Welfare Officer / 2IC';
      case 2:
        return 'Commandant (Commanding Officer)';
      default:
        return 'Company Commander';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'My Requests & Tracking',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'Emergency SOS',
            icon: const Icon(Icons.support_agent_rounded, color: Ux4gDefenseTheme.mhaNavy),
            onPressed: () => SosDialog.show(context),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadRequests,
          child: _isLoading && _requests.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _requests.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inbox_outlined, size: 54, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            const Text(
                              'No requests yet',
                              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'When you submit a leave request or grievance, its real-time status and SLA countdown will appear here.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 13.5, color: Colors.grey.shade600, height: 1.4),
                            ),
                            const SizedBox(height: 20),
                            ElevatedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => RequestHelpScreen(onRequestSubmitted: _loadRequests),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Ux4gDefenseTheme.mhaNavy,
                                foregroundColor: Colors.white,
                              ),
                              icon: const Icon(Icons.add),
                              label: const Text('Submit a Request'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      itemCount: _requests.length,
                      itemBuilder: (context, index) {
                        final req = _requests[index];
                        final status = req['status']?.toString() ?? 'submitted';
                        final statusColor = _getStatusColor(status);
                        final hoursRem = (req['sla_hours_remaining'] as num?)?.toDouble() ?? 72.0;
                        final isBreached = req['sla_breached'] == 1 || req['sla_breached'] == true;
                        final escalationLevel = (req['escalation_level'] as num?)?.toInt() ?? 0;
                        final category = req['category']?.toString() ?? 'General Request';
                        final filedAtStr = req['created_at']?.toString() ?? '';

                        DateTime? filedDate;
                        try {
                          filedDate = DateTime.parse(filedAtStr);
                        } catch (_) {}

                        return Card(
                          margin: const EdgeInsets.only(bottom: 14),
                          elevation: 1.5,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(
                              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Category and Status Badge
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        category.replaceAll('_', ' ').toUpperCase(),
                                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: statusColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        _formatStatusLabel(status),
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: statusColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 6),
                                if (filedDate != null)
                                  Text(
                                    'Submitted: ${DateFormat('dd MMM yyyy, hh:mm a').format(filedDate)}',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                  ),

                                if (req['description']?.toString().isNotEmpty == true) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    req['description'].toString(),
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      color: isDark ? Colors.white70 : Colors.black87,
                                    ),
                                  ),
                                ],

                                const SizedBox(height: 14),
                                const Divider(height: 1),
                                const SizedBox(height: 12),

                                // SLA Countdown or Auto-Escalation Banner
                                if (isBreached || escalationLevel > 0) ...[
                                  // TRUST-BUILDING AUTO-ESCALATION BANNER
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEFF6FF),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFF93C5FD)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.arrow_upward_rounded, color: Ux4gDefenseTheme.mhaNavy, size: 20),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            'Auto-escalated to ${_getEscalationTierName(escalationLevel)}.\nThe system escalated this automatically for you.',
                                            style: const TextStyle(
                                              fontSize: 12.5,
                                              fontWeight: FontWeight.bold,
                                              color: Ux4gDefenseTheme.mhaNavy,
                                              height: 1.3,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ] else if (status.toLowerCase() == 'approved' || status.toLowerCase() == 'resolved') ...[
                                  const Row(
                                    children: [
                                      Icon(Icons.check_circle, size: 16, color: Ux4gDefenseTheme.defenseGreen),
                                      SizedBox(width: 6),
                                      Text(
                                        'Completed within statutory SLA',
                                        style: TextStyle(fontSize: 12.5, color: Ux4gDefenseTheme.defenseGreen, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ] else ...[
                                  // Visual SLA countdown progress bar
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '${hoursRem.toStringAsFixed(0)} hours remaining',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: Ux4gDefenseTheme.mhaNavy,
                                            ),
                                          ),
                                          const Text(
                                            '72h SLA Target',
                                            style: TextStyle(fontSize: 12, color: Colors.grey),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: LinearProgressIndicator(
                                          value: (hoursRem / 72.0).clamp(0.0, 1.0),
                                          backgroundColor: Colors.grey.shade300,
                                          color: Ux4gDefenseTheme.mhaNavy,
                                          minHeight: 6,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],

                                // Offline badge
                                if (req['sync_status'] == 'PENDING_SYNC') ...[
                                  const SizedBox(height: 8),
                                  const Row(
                                    children: [
                                      Icon(Icons.cloud_upload_outlined, size: 14, color: Color(0xFF93C5FD)),
                                      SizedBox(width: 6),
                                      Text(
                                        'Saved on phone — will send when network returns',
                                        style: TextStyle(fontSize: 11.5, color: Color(0xFF93C5FD)),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ),
    );
  }
}
