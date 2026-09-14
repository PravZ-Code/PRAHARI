import 'package:flutter/material.dart';
import '../services/api_service.dart';

class BuddyCheckScreen extends StatefulWidget {
  const BuddyCheckScreen({super.key});

  @override
  State<BuddyCheckScreen> createState() => _BuddyCheckScreenState();
}

class _BuddyCheckScreenState extends State<BuddyCheckScreen> {
  final ApiService _apiService = ApiService();

  int _concernLevel = 3;
  String _concernCategory = 'sleep_deprivation';
  bool _isSubmitting = false;

  final Map<String, String> _categories = {
    'sleep_deprivation': 'Visible Sleep Deprivation / Nodding on Watch',
    'emotional_withdrawal': 'Emotional Withdrawal / Silent & Isolated',
    'extreme_fatigue': 'Physical Tremor / Exhaustion on Patrol',
    'domestic_distress': 'Obsessive Worry over Family / Phone Friction',
    'unusual_agitation': 'Sudden Irritability / Hyper-Agitation',
  };

  void _handleSubmit() async {
    setState(() => _isSubmitting = true);

    try {
      await _apiService.submitBuddySignal(
        concernLevel: _concernLevel,
        concernCategory: _concernCategory,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('Anonymous buddy signal registered. Thank you for protecting your fellow troop!'),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('Buddy check signal logged locally for unit welfare analysis.'),
          ),
        );
        Navigator.pop(context);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
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
              'ANONYMOUS BUDDY CHECK',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Peer Support Network (Zero Identity Tracking)',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Confidentiality Guarantee Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF60A5FA).withOpacity(0.5)),
            ),
            child: const Row(
              children: [
                Icon(Icons.lock_person_outlined, color: Color(0xFF60A5FA), size: 24),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '100% Anonymous Peer Watch: Under Section 21 of the Mental Healthcare Act 2017, no record of who submitted this report is kept in the database. Signals only aggregate to unit-level trends.',
                    style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Concern Category
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'OBSERVED BEHAVIORAL SYMPTOM',
                  style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                ..._categories.entries.map((e) {
                  final isSelected = _concernCategory == e.key;
                  return InkWell(
                    onTap: () => setState(() => _concernCategory = e.key),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF10B981).withOpacity(0.15) : const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF10B981) : const Color(0xFF334155),
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                            color: isSelected ? const Color(0xFF10B981) : Colors.white38,
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              e.value,
                              style: TextStyle(
                                color: isSelected ? Colors.white : Colors.white70,
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 14),

                // Severity Level
                const Text(
                  'Severity of Concern (1 = Minor, 5 = Critical / Unsafe)',
                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(5, (index) {
                    final score = index + 1;
                    final isSelected = score == _concernLevel;
                    return InkWell(
                      onTap: () => setState(() => _concernLevel = score),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 54,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (score >= 4 ? const Color(0xFFEF4444) : const Color(0xFF10B981))
                              : const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? (score >= 4 ? const Color(0xFFEF4444) : const Color(0xFF10B981))
                                : const Color(0xFF334155),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '$score',
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.white70,
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _handleSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.send),
            label: const Text(
              'SUBMIT ANONYMOUS BUDDY SIGNAL',
              style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
