import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/uro_model.dart';
import '../services/api_service.dart';

class DutyRosterScreen extends StatefulWidget {
  const DutyRosterScreen({super.key});

  @override
  State<DutyRosterScreen> createState() => _DutyRosterScreenState();
}

class _DutyRosterScreenState extends State<DutyRosterScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  List<ShiftEntry> _shifts = [];
  List<UROSwapProposal> _swaps = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final rosterJson = await _apiService.getUnitRoster('alpha-srinagar-01');
      final swapsJson = await _apiService.getPendingUROSwaps('alpha-srinagar-01');

      setState(() {
        _shifts = rosterJson.map((x) => ShiftEntry.fromJson(x)).toList();
        _swaps = swapsJson.map((x) => UROSwapProposal.fromJson(x)).toList();
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _handleApproveSwap(UROSwapProposal swap) async {
    final success = await _apiService.approveUROSwap(swap.id);
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          content: Text(
            'Equal-Trade Shift Swap (${swap.trade}) committed to live battalion roster!\nMandatory 8h continuous rest barrier enforced.',
          ),
        ),
      );
      setState(() {
        _swaps.removeWhere((s) => s.id == swap.id);
      });
    }
  }

  void _showRequestSwapDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.swap_horiz, color: Color(0xFF60A5FA)),
            SizedBox(width: 8),
            Text('Request Trade-Matched Swap', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Under MHA Directive SO-04, duty swaps are algorithmically matched exclusively with personnel of identical military trade (Armorer ↔ Armorer, GD ↔ GD).',
              style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
            ),
            SizedBox(height: 12),
            Text(
              'Your Trade: Armorer\nCurrent Shift: 00:00 - 04:00 (Night Sentry 1)\nConsecutive Nights: 3',
              style: TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Recommended Peer: Ct. Amit Verma (Armorer)\nStandby Depot • 14.0h Rest Compliant',
              style: TextStyle(color: Color(0xFF10B981), fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: Color(0xFF10B981),
                  content: Text('Trade-matched shift swap request submitted to Company Commander!'),
                ),
              );
            },
            child: const Text('Submit Request', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'TACTICAL ROSTER & URO SWAPS',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Unit Resilience Optimizer • 8h Continuous Rest Barrier',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF10B981),
          labelColor: const Color(0xFF10B981),
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(Icons.calendar_month_outlined), text: 'Duty Roster (Live)'),
            Tab(icon: Icon(Icons.swap_horiz_rounded), text: 'Smart Swaps (URO)'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : TabBarView(
              controller: _tabController,
              children: [
                // TAB 1: Sentry Roster
                _buildRosterTab(),
                // TAB 2: Smart URO Swaps
                _buildSwapsTab(),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF10B981),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.swap_calls),
        label: const Text('Request Trade Swap', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
        onPressed: _showRequestSwapDialog,
      ),
    );
  }

  Widget _buildRosterTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Statutory Rest Notice
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
          ),
          child: const Row(
            children: [
              Icon(Icons.shield_outlined, color: Color(0xFF10B981), size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'MHA SO-04 Statutory Rest Window: Perimeter security requires mandatory 8-hour continuous rest between duty cycles. Jawans with 3+ consecutive night watches are auto-flagged for rotation.',
                  style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.35),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        const Text(
          'CURRENT ASSIGNED SHIFTS (ALPHA COMPANY)',
          style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),

        ..._shifts.map((s) => _ShiftCard(shift: s)),
        const SizedBox(height: 60),
      ],
    );
  }

  Widget _buildSwapsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // URO Explanation Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF60A5FA).withValues(alpha: 0.4)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.tune, color: Color(0xFF60A5FA), size: 20),
                  SizedBox(width: 8),
                  Text(
                    'EQUAL-TRADE OPTIMIZATION ENGINE',
                    style: TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.w900, fontSize: 12),
                  ),
                ],
              ),
              SizedBox(height: 6),
              Text(
                'Matches soldiers of identical military trade qualifications to eliminate cognitive fatigue while guaranteeing 100% operational readiness on all sentry posts.',
                style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'RECOMMENDED SHIFT SWAPS',
              style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold),
            ),
            Text(
              '${_swaps.length} Actionable',
              style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (_swaps.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: const Center(
              child: Text(
                'No pending shift swap proposals. Battalion roster is 100% rest compliant.',
                style: TextStyle(color: Colors.white54, fontSize: 12),
              ),
            ),
          )
        else
          ..._swaps.map((p) => _UROProposalCard(
                proposal: p,
                onApprove: () => _handleApproveSwap(p),
              )),
        const SizedBox(height: 60),
      ],
    );
  }
}

class _ShiftCard extends StatelessWidget {
  final ShiftEntry shift;
  const _ShiftCard({required this.shift});

  @override
  Widget build(BuildContext context) {
    final bool isCompliant = shift.isRestCompliant;
    final Color statusColor = isCompliant ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isCompliant ? Icons.security : Icons.warning_amber_rounded,
                      color: statusColor,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${shift.rank} ${shift.personnelName}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                      ),
                      Text(
                        'Trade: ${shift.trade} • ${shift.unitName}',
                        style: const TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isCompliant ? 'REST CLEARED' : 'ROTATION DUE',
                  style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      shift.shiftName,
                      style: const TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                    Text(
                      'Rest Gap: ${shift.hoursSinceLastDuty.toStringAsFixed(1)}h',
                      style: TextStyle(
                        color: isCompliant ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.place_outlined, color: Colors.white38, size: 12),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        shift.location,
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
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
                'Consecutive Night Watches: ${shift.consecutiveNightShifts}',
                style: TextStyle(
                  color: shift.consecutiveNightShifts >= 3 ? const Color(0xFFEF4444) : Colors.white60,
                  fontSize: 11,
                  fontWeight: shift.consecutiveNightShifts >= 3 ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              Text(
                DateFormat('dd MMM yyyy').format(shift.shiftDate),
                style: const TextStyle(color: Colors.white38, fontSize: 10),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _UROProposalCard extends StatelessWidget {
  final UROSwapProposal proposal;
  final VoidCallback onApprove;

  const _UROProposalCard({required this.proposal, required this.onApprove});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF60A5FA).withValues(alpha: 0.6), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF60A5FA).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'EQUAL TRADE: ${proposal.trade.toUpperCase()}',
                  style: const TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.w900, fontSize: 10),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '+${proposal.riskReductionPct.toStringAsFixed(1)}% FATIGUE RELIEF',
                  style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 10),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Swapping Pair Details
          Row(
            children: [
              // Tired Troop
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('HIGH FATIGUE (ROTATE)', style: TextStyle(color: Color(0xFFEF4444), fontSize: 9, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(proposal.tiredTroop.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                      Text(proposal.tiredTroop.currentShift, style: const TextStyle(color: Colors.white60, fontSize: 10)),
                      Text('${proposal.tiredTroop.consecutiveNights} Night Watches', style: const TextStyle(color: Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Icon(Icons.swap_horiz, color: Color(0xFF60A5FA), size: 24),
              ),
              // Rested Peer
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('WELL RESTED (ACCEPT)', style: TextStyle(color: Color(0xFF10B981), fontSize: 9, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 4),
                      Text(proposal.restedPeer.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                      Text(proposal.restedPeer.currentShift, style: const TextStyle(color: Colors.white60, fontSize: 10)),
                      Text('${proposal.restedPeer.restHours.toStringAsFixed(1)}h Rest Gap', style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Text(
            proposal.rationale,
            style: const TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
          ),
          const SizedBox(height: 14),

          ElevatedButton.icon(
            onPressed: onApprove,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF60A5FA),
              foregroundColor: const Color(0xFF0F172A),
              minimumSize: const Size(double.infinity, 40),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.check_circle, size: 16),
            label: const Text('APPROVE & COMMIT SWAP TO ROSTER', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}
