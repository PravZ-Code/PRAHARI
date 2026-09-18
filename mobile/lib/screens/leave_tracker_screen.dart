import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dashboard_provider.dart';
import '../models/grievance_model.dart';
import '../services/api_service.dart';

class LeaveTrackerScreen extends StatefulWidget {
  const LeaveTrackerScreen({super.key});

  @override
  State<LeaveTrackerScreen> createState() => _LeaveTrackerScreenState();
}

class _LeaveTrackerScreenState extends State<LeaveTrackerScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _apiService = ApiService();

  String _selectedCategory = 'family_emergency';
  final _descriptionController = TextEditingController();
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  DateTime _endDate = DateTime.now().add(const Duration(days: 10));
  bool _isSubmitting = false;

  Timer? _countdownTimer;
  List<dynamic> _historicalLeaves = [];

  final Map<String, String> _categories = {
    'family_emergency': 'Family Medical Emergency',
    'medical_emergency': 'Personal Acute Medical Need',
    'bereavement': 'Bereavement / Death in Family',
    'acute_domestic_crisis': 'Urgent Domestic Dispute / Court Matter',
    'annual_leave': 'Regular Annual Leave (15 Days)',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadGrievances();
      _loadHistory();
    });

    // Tick every 1 second to update the live 72-hour countdown timers
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  Future<void> _loadHistory() async {
    try {
      final history = await _apiService.getLeaveHistory();
      if (mounted) setState(() => _historicalLeaves = history);
    } catch (_) {}
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _tabController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _handleApplyLeave() async {
    final desc = _descriptionController.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe the emergency situation')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final dash = context.read<DashboardProvider>();

    final dateFormat = DateFormat('yyyy-MM-dd');
    final success = await dash.submitEmergencyLeave(
      category: _selectedCategory,
      description: desc,
      startDate: dateFormat.format(_startDate),
      endDate: dateFormat.format(_endDate),
    );

    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        _descriptionController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('72-Hour Fast-Track leave submitted with active SLA countdown timer!'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFEF4444),
            content: Text(dash.errorMessage ?? 'Submission failed'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dash = context.watch<DashboardProvider>();
    final grievances = dash.activeGrievances;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '72-HOUR FAST-TRACK LEAVE',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Guaranteed SLA Resolution with Chain Escalation',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFFBBF24),
          labelColor: const Color(0xFFFBBF24),
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(Icons.timer_outlined), text: 'Active 72h SLA'),
            Tab(icon: Icon(Icons.history_outlined), text: 'Leave History & Logs'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: Active 72h Fast-Track
          _buildActiveTab(grievances),
          // TAB 2: Historical Logs & Denial Reasons
          _buildHistoryTab(),
        ],
      ),
    );
  }

  Widget _buildActiveTab(List<GrievanceModel> grievances) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // SLA Assurance Banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.4)),
          ),
          child: const Row(
            children: [
              Icon(Icons.timer_outlined, color: Color(0xFFFBBF24), size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Guaranteed 72-Hour SLA: MHA operational guidelines mandate an automatic countdown timer on all emergency requests. If unaddressed, requests automatically escalate up the chain of command.',
                  style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.4),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Active Requests Section
        const Text(
          'ACTIVE EMERGENCY REQUESTS (LIVE SLA TIMERS)',
          style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),

        if (grievances.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: const Center(
              child: Text(
                'No active emergency leave requests pending.',
                style: TextStyle(color: Colors.white54, fontSize: 12),
              ),
            ),
          )
        else
          ...grievances.map((g) => _GrievanceCard(grievance: g)),

        const SizedBox(height: 24),

        // New Emergency Application Form
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.add_circle_outline, color: Color(0xFF10B981), size: 20),
                  SizedBox(width: 8),
                  Text(
                    'FILE NEW EMERGENCY LEAVE',
                    style: TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Category Dropdown
              const Text('Emergency Category', style: TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedCategory,
                    isExpanded: true,
                    dropdownColor: const Color(0xFF1E293B),
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    items: _categories.entries.map((e) {
                      return DropdownMenuItem(value: e.key, child: Text(e.value));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedCategory = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Description
              const Text('Situation Summary / Medical Context', style: TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 6),
              TextField(
                controller: _descriptionController,
                maxLines: 3,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'e.g. Father hospitalized in AIIMS Delhi with cardiac event; immediate escort required...',
                  hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF0F172A),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 14),

              // Dates
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('From Date', style: TextStyle(color: Colors.white70, fontSize: 11)),
                        const SizedBox(height: 4),
                        InkWell(
                          onTap: () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: _startDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 90)),
                            );
                            if (d != null) setState(() => _startDate = d);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              DateFormat('dd MMM yyyy').format(_startDate),
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('To Date', style: TextStyle(color: Colors.white70, fontSize: 11)),
                        const SizedBox(height: 4),
                        InkWell(
                          onTap: () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: _endDate,
                              firstDate: _startDate,
                              lastDate: DateTime.now().add(const Duration(days: 120)),
                            );
                            if (d != null) setState(() => _endDate = d);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              DateFormat('dd MMM yyyy').format(_endDate),
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Submit Button
              ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _handleApplyLeave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFBBF24),
                  foregroundColor: const Color(0xFF0F172A),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0F172A)),
                      )
                    : const Icon(Icons.send),
                label: const Text(
                  'SUBMIT 72-HOUR FAST-TRACK REQUEST',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildHistoryTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF60A5FA).withValues(alpha: 0.4)),
          ),
          child: const Row(
            children: [
              Icon(Icons.archive_outlined, color: Color(0xFF60A5FA), size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Battalion Leave Records: Complete transparent audit of past applications with operational justifications, commanding approvals, and deferral rationales.',
                  style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.35),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        const Text(
          'HISTORICAL LEAVE DECISIONS',
          style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),

        ..._historicalLeaves.map((item) => _HistoricalLeaveCard(item: item)),
        const SizedBox(height: 32),
      ],
    );
  }
}

class _GrievanceCard extends StatelessWidget {
  final GrievanceModel grievance;
  const _GrievanceCard({required this.grievance});

  @override
  Widget build(BuildContext context) {
    final double hoursLeft = grievance.hoursRemaining;
    final bool isBreached = grievance.slaBreached || hoursLeft <= 0;

    // Escalation ladder determination
    // Level 0: Commander (< 24h elapsed)
    // Level 1: Welfare Officer (24h - 48h elapsed)
    // Level 2: DIG / MHA (48h - 72h elapsed)
    final double elapsedHours = (72.0 - hoursLeft).clamp(0.0, 72.0);
    final int ladderStage = elapsedHours > 48 ? 2 : (elapsedHours > 24 ? 1 : 0);

    // Format remaining time as HH:MM:SS
    final int hours = hoursLeft.floor().clamp(0, 72);
    final int minutes = ((hoursLeft - hours) * 60).floor().clamp(0, 59);
    final int seconds = ((hoursLeft * 3600) % 60).floor().clamp(0, 59);
    final String timeDisplay = '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isBreached ? const Color(0xFFEF4444) : const Color(0xFFFBBF24),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // SLA Timer Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isBreached
                      ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                      : const Color(0xFFFBBF24).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isBreached ? Icons.timer_off : Icons.timelapse,
                      color: isBreached ? const Color(0xFFEF4444) : const Color(0xFFFBBF24),
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isBreached ? 'SLA EXPIRED (AUTO-ESCALATED)' : 'SLA COUNTDOWN: $timeDisplay',
                      style: TextStyle(
                        color: isBreached ? const Color(0xFFEF4444) : const Color(0xFFFBBF24),
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  grievance.status.toUpperCase(),
                  style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Text(
            grievance.category.replaceAll('_', ' ').toUpperCase(),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
          ),
          if (grievance.description != null) ...[
            const SizedBox(height: 4),
            Text(
              grievance.description!,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
          const SizedBox(height: 12),

          // Escalation Progress Ladder
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CHAIN ESCALATION STATUS',
                  style: TextStyle(color: Colors.white38, fontSize: 9, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _EscalationNode(
                      title: 'Company Cmdr',
                      isActive: ladderStage >= 0,
                      isCurrent: ladderStage == 0,
                    ),
                    _EscalationLine(isPassed: ladderStage >= 1),
                    _EscalationNode(
                      title: 'WO Meera',
                      isActive: ladderStage >= 1,
                      isCurrent: ladderStage == 1,
                    ),
                    _EscalationLine(isPassed: ladderStage >= 2),
                    _EscalationNode(
                      title: 'DIG / MHA',
                      isActive: ladderStage >= 2,
                      isCurrent: ladderStage == 2,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Filed: ${DateFormat('dd MMM, HH:mm').format(grievance.filedAt)}',
                style: const TextStyle(color: Colors.white38, fontSize: 10),
              ),
              const Text(
                'Guaranteed 72h MHA Resolution',
                style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HistoricalLeaveCard extends StatelessWidget {
  final Map<String, dynamic> item;
  const _HistoricalLeaveCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final status = (item['status'] ?? 'approved').toString();
    final bool isApproved = status == 'approved';
    final Color color = isApproved ? const Color(0xFF10B981) : const Color(0xFFF97316);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                (item['category'] ?? 'emergency').toString().replaceAll('_', ' ').toUpperCase(),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status.replaceAll('_', ' ').toUpperCase(),
                  style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 10),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            item['description'] ?? '',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
          if (item['denial_reason'] != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFF97316).withValues(alpha: 0.4)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFFF97316), size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Operational Deferral Rationale: ${item["denial_reason"]}',
                      style: const TextStyle(color: Color(0xFFF97316), fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Decided by: ${item["decision_by"] ?? "Command"}',
                style: const TextStyle(color: Colors.white38, fontSize: 10),
              ),
              Text(
                'Duration: ${item["duration_days"] ?? 7} Days',
                style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EscalationNode extends StatelessWidget {
  final String title;
  final bool isActive;
  final bool isCurrent;

  const _EscalationNode({required this.title, required this.isActive, required this.isCurrent});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive
                ? (isCurrent ? const Color(0xFFFBBF24) : const Color(0xFF10B981))
                : const Color(0xFF334155),
            border: Border.all(
              color: isCurrent ? Colors.white : Colors.transparent,
              width: 2,
            ),
          ),
          child: Icon(
            isActive ? Icons.check : Icons.circle,
            size: 10,
            color: isActive ? Colors.black : Colors.white24,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(
            color: isCurrent ? const Color(0xFFFBBF24) : (isActive ? Colors.white : Colors.white38),
            fontSize: 9,
            fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}

class _EscalationLine extends StatelessWidget {
  final bool isPassed;
  const _EscalationLine({required this.isPassed});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 12),
        color: isPassed ? const Color(0xFF10B981) : const Color(0xFF334155),
      ),
    );
  }
}
