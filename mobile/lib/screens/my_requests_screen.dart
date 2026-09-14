import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dashboard_provider.dart';
import '../models/grievance_model.dart';
import 'request_help_screen.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadGrievances();
    });

    // 1-second countdown ticker for live 72h countdown timers
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dash = context.watch<DashboardProvider>();
    final requests = dash.activeGrievances;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'MY REQUESTS & LEAVE TRACKER',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              '72-Hour Guaranteed SLA & Resolution Audit',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: 'Refresh Status',
            onPressed: () => dash.loadGrievances(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => dash.loadGrievances(),
        backgroundColor: const Color(0xFF1E293B),
        color: const Color(0xFF10B981),
        child: requests.isEmpty
            ? _buildEmptyState(context)
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: requests.length,
                separatorBuilder: (context, index) => const SizedBox(height: 14),
                itemBuilder: (ctx, idx) => _RequestCard(request: requests[idx]),
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF10B981),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Request', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const RequestHelpScreen()),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.18),
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF1E293B),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: const Icon(Icons.inbox_outlined, color: Colors.white38, size: 36),
              ),
              const SizedBox(height: 16),
              const Text(
                'No Active or Historical Requests',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'You have not submitted any emergency leave, welfare support, or grievance requests yet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const RequestHelpScreen()),
                  );
                },
                icon: const Icon(Icons.add, size: 18),
                label: const Text('SUBMIT A REQUEST'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RequestCard extends StatelessWidget {
  final GrievanceModel request;

  const _RequestCard({required this.request});

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'resolved':
        return const Color(0xFF10B981);
      case 'fast_tracked':
      case 'in_progress':
      case 'under_review':
        return const Color(0xFF38BDF8);
      case 'escalated':
        return const Color(0xFFFBBF24);
      case 'rejected':
        return const Color(0xFFEF4444);
      case 'filed':
      case 'submitted':
      default:
        return const Color(0xFF94A3B8);
    }
  }

  String _formatStatus(String status) {
    switch (status.toLowerCase()) {
      case 'fast_tracked':
        return 'Fast-Track Active';
      case 'in_progress':
        return 'In Progress';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'resolved':
        return 'Resolved';
      case 'filed':
      default:
        return 'Submitted';
    }
  }

  String _formatCategory(String cat) {
    return cat
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(request.status);
    final isDone = request.status == 'approved' || request.status == 'resolved' || request.status == 'rejected';

    // Calculate live SLA remaining time
    final now = DateTime.now();
    final diff = request.slaDeadline.difference(now);
    final hours = diff.inHours;
    final minutes = diff.inMinutes % 60;
    final seconds = diff.inSeconds % 60;
    final isOverdue = diff.isNegative && !isDone;

    final filedFmt = DateFormat('dd MMM yyyy, HH:mm').format(request.filedAt);

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: request.isFastLane ? const Color(0xFFFBBF24).withValues(alpha: 0.5) : const Color(0xFF334155),
          width: request.isFastLane ? 1.2 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
              border: Border(bottom: BorderSide(color: const Color(0xFF334155).withValues(alpha: 0.6))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      request.requestType == 'leave' ? Icons.flight_takeoff : Icons.volunteer_activism,
                      color: request.isFastLane ? const Color(0xFFFBBF24) : const Color(0xFF60A5FA),
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      request.requestType.toUpperCase(),
                      style: TextStyle(
                        color: request.isFastLane ? const Color(0xFFFBBF24) : const Color(0xFF60A5FA),
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                      ),
                    ),
                    if (request.isFastLane) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFBBF24).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          '72H FAST-LANE',
                          style: TextStyle(color: Color(0xFFFBBF24), fontSize: 9, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ],
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: statusColor.withValues(alpha: 0.5)),
                  ),
                  child: Text(
                    _formatStatus(request.status).toUpperCase(),
                    style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
          ),

          // Content Body
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatCategory(request.category),
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Filed on $filedFmt',
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),

                if (request.description != null && request.description!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    request.description!,
                    style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
                  ),
                ],

                if (request.startDate != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.date_range, color: Color(0xFF10B981), size: 14),
                      const SizedBox(width: 6),
                      Text(
                        'Leave Window: ${request.startDate} to ${request.endDate ?? "Open"}',
                        style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 14),
                const Divider(color: Color(0xFF334155)),
                const SizedBox(height: 8),

                // Live 72h SLA Countdown or Final Resolution status
                if (!isDone)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('STATUTORY SLA DEADLINE', style: TextStyle(color: Colors.white38, fontSize: 9)),
                          const SizedBox(height: 2),
                          Text(
                            isOverdue
                                ? 'OVERDUE - AUTO ESCALATED'
                                : '${hours.toString().padLeft(2, '0')}h ${minutes.toString().padLeft(2, '0')}m ${seconds.toString().padLeft(2, '0')}s remaining',
                            style: TextStyle(
                              color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Tier ${request.escalationLevel} Review',
                          style: const TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  )
                else ...[
                  // Resolved / Approved / Rejected notes
                  Row(
                    children: [
                      Icon(
                        request.status == 'approved' || request.status == 'resolved'
                            ? Icons.check_circle
                            : Icons.cancel,
                        color: statusColor,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          request.resolutionNotes ??
                              request.rejectionReason ??
                              'Request has been processed and recorded in the audit ledger.',
                          style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
