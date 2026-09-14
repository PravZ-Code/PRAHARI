import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class CommanderScreen extends StatelessWidget {
  const CommanderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'COMMAND TACTICAL CONSOLE',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Operational Rest & Fatigue Oversight | Section 21 MHCA Firewall',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white70),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Privacy Firewall Notice
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.5)),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield, color: Color(0xFF10B981), size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Statutory Privacy Firewall Active: Commanders view duty rest and operational fatigue tags only. Personal clinical psychological notes are strictly partitioned.',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Unit Readiness Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'ALPHA COMPANY (SRINAGAR)',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
                    ),
                    Text(
                      'High Altitude CI',
                      style: TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Unit Operational Readiness', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    const Text('88.4%', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: const LinearProgressIndicator(
                    value: 0.884,
                    minHeight: 8,
                    backgroundColor: Color(0xFF334155),
                    valueColor: AlwaysStoppedAnimation(Color(0xFF10B981)),
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0xFF334155)),
                const SizedBox(height: 8),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _CommanderStat(label: 'Authorized', value: '200'),
                    _CommanderStat(label: 'On Sentry Post', value: '142'),
                    _CommanderStat(label: 'Rest Compliant', value: '178', color: Color(0xFF10B981)),
                    _CommanderStat(label: 'Rest Rotation', value: '8', color: Color(0xFFEF4444)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Battalion Risk Distribution Bar
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'BATTALION FATIGUE DISTRIBUTION (1,000 TROOPS)',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 1.0),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _RiskBarSegment(flex: 850, color: const Color(0xFF10B981), label: '850 Green (85%)'),
                    _RiskBarSegment(flex: 95, color: const Color(0xFFFBBF24), label: '95 Yellow (9.5%)'),
                    _RiskBarSegment(flex: 35, color: const Color(0xFFF97316), label: '35 Orange (3.5%)'),
                    _RiskBarSegment(flex: 20, color: const Color(0xFFEF4444), label: '20 Red (2%)'),
                  ],
                ),
                const SizedBox(height: 16),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _LegendItem(color: Color(0xFF10B981), text: 'Green: Ready (850)'),
                    _LegendItem(color: Color(0xFFFBBF24), text: 'Yellow: Watch (95)'),
                    _LegendItem(color: Color(0xFFF97316), text: 'Orange: Rest (35)'),
                    _LegendItem(color: Color(0xFFEF4444), text: 'Red: Relief (20)'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Unit Resilience Optimizer (URO) Swap Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF60A5FA).withOpacity(0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.swap_horiz, color: Color(0xFF60A5FA), size: 22),
                    SizedBox(width: 8),
                    Text(
                      'SMART SHIFT SWAP PROPOSAL (URO)',
                      style: TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  'Optimizer identified 3 sentries with 3+ consecutive night watches. Recommended swaps with equal-trade Armorers guarantees mandatory 8-hour continuous rest barrier.',
                  style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                ),
                const SizedBox(height: 14),
                ElevatedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: Color(0xFF10B981),
                        content: Text('Shift swap approved & committed to live battalion roster!'),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF60A5FA),
                    foregroundColor: const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.check, size: 18),
                  label: const Text('APPROVE & COMMIT SWAPS', style: TextStyle(fontWeight: FontWeight.w900)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _CommanderStat extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;

  const _CommanderStat({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(color: color ?? Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10)),
      ],
    );
  }
}

class _RiskBarSegment extends StatelessWidget {
  final int flex;
  final Color color;
  final String label;

  const _RiskBarSegment({required this.flex, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: flex,
      child: Container(
        height: 14,
        margin: const EdgeInsets.symmetric(horizontal: 1),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(3),
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String text;

  const _LegendItem({required this.color, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: Colors.white60, fontSize: 9)),
      ],
    );
  }
}
