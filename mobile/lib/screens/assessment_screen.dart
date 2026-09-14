import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/assessment_model.dart';
import '../providers/dashboard_provider.dart';

class AssessmentScreen extends StatefulWidget {
  const AssessmentScreen({super.key});

  @override
  State<AssessmentScreen> createState() => _AssessmentScreenState();
}

class _AssessmentScreenState extends State<AssessmentScreen> {
  double _sleepHours = 6.5;
  int _sleepQuality = 3;
  int _moodScore = 3;
  int _energyLevel = 3;
  int _stressLevel = 3;
  int _appetiteScore = 3;
  int _socialConnection = 3;
  final _noteController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    setState(() => _isSubmitting = true);

    final dash = context.read<DashboardProvider>();
    final model = AssessmentModel(
      sleepHours: _sleepHours,
      sleepQuality: _sleepQuality,
      moodScore: _moodScore,
      energyLevel: _energyLevel,
      stressLevel: _stressLevel,
      appetiteScore: _appetiteScore,
      socialConnection: _socialConnection,
      freeText: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
      assessedAt: DateTime.now(),
    );

    final success = await dash.submitAssessment(model);
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('Daily wellness assessment logged and analyzed!'),
          ),
        );
        Navigator.pop(context);
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
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'DAILY WELLNESS PULSE',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Confidential Self-Reporting (Section 21 MHCA 2017 Protected)',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Statutory Privacy Notice
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.8),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
            ),
            child: const Row(
              children: [
                Icon(Icons.privacy_tip_outlined, color: Color(0xFF10B981), size: 22),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '100% Stigma-Free: Raw emotional scores are encrypted and visible only to the clinical welfare counselor. Commanders only see aggregate duty readiness tags.',
                    style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 1. Sleep Hours & Quality
          _AssessmentCard(
            title: 'SLEEP RECOVERY',
            icon: Icons.bedtime_outlined,
            children: [
              Text(
                'Hours of sleep in last 24h: ${_sleepHours.toStringAsFixed(1)} hrs',
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
              ),
              Slider(
                value: _sleepHours,
                min: 0.0,
                max: 14.0,
                divisions: 28,
                activeColor: const Color(0xFF10B981),
                inactiveColor: const Color(0xFF334155),
                onChanged: (val) => setState(() => _sleepHours = val),
              ),
              const SizedBox(height: 10),
              _ScoreSelector(
                title: 'Sleep Quality (1 = Poor/Interrupted, 5 = Deep)',
                value: _sleepQuality,
                onChanged: (v) => setState(() => _sleepQuality = v),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 2. Physical & Emotional States
          _AssessmentCard(
            title: 'MENTAL & PHYSICAL STATE',
            icon: Icons.favorite_border,
            children: [
              _ScoreSelector(
                title: 'Perceived Stress (1 = Relaxed, 5 = Extreme)',
                value: _stressLevel,
                onChanged: (v) => setState(() => _stressLevel = v),
              ),
              const SizedBox(height: 12),
              _ScoreSelector(
                title: 'Physical Energy (1 = Exhausted, 5 = High Energy)',
                value: _energyLevel,
                onChanged: (v) => setState(() => _energyLevel = v),
              ),
              const SizedBox(height: 12),
              _ScoreSelector(
                title: 'General Mood (1 = Very Low, 5 = Optimistic)',
                value: _moodScore,
                onChanged: (v) => setState(() => _moodScore = v),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 3. Social & Nutrition
          _AssessmentCard(
            title: 'NUTRITION & PEER CONNECTION',
            icon: Icons.group_outlined,
            children: [
              _ScoreSelector(
                title: 'Appetite / Food Intake (1 = Poor, 5 = Normal)',
                value: _appetiteScore,
                onChanged: (v) => setState(() => _appetiteScore = v),
              ),
              const SizedBox(height: 12),
              _ScoreSelector(
                title: 'Buddy / Family Contact (1 = Isolated, 5 = Strong)',
                value: _socialConnection,
                onChanged: (v) => setState(() => _socialConnection = v),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 4. Confidential Free Text
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
                  'CONFIDENTIAL WELFARE NOTE (OPTIONAL)',
                  style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _noteController,
                  maxLines: 3,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Share any family stress or personal health friction for the welfare officer...',
                    hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Submit Button
          ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _handleSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.check_circle_outline),
            label: const Text(
              'SUBMIT DAILY PULSE',
              style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.0),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _AssessmentCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _AssessmentCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFF10B981), size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF10B981),
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _ScoreSelector extends StatelessWidget {
  final String title;
  final int value;
  final ValueChanged<int> onChanged;

  const _ScoreSelector({
    required this.title,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(5, (index) {
            final score = index + 1;
            final isSelected = score == value;
            return InkWell(
              onTap: () => onChanged(score),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: 52,
                height: 38,
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF10B981) : const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF10B981) : const Color(0xFF334155),
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
    );
  }
}
