import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/assessment_model.dart';
import '../providers/dashboard_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

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
      appetiteScore: 3,
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
            backgroundColor: Ux4gDefenseTheme.defenseGreen,
            content: Text('Daily wellness pulse logged! Protected under Section 21 MHCA 2017.'),
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Ux4gDefenseTheme.crisisRed,
            content: Text(dash.errorMessage ?? 'Submission failed. Saved to local offline queue.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'DAILY WELLNESS PULSE',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'Confidential Self-Assessment (PHQ-9 / GAD-7 Parity)',
              style: TextStyle(fontSize: 10.5, color: Color(0xFFCBD5E1)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Statutory Medical Privacy Notice
            Ux4gCard(
              accentColor: Ux4gDefenseTheme.mhaNavy,
              padding: const EdgeInsets.all(14.0),
              child: Row(
                children: [
                  const Icon(Icons.privacy_tip_outlined, size: 22.0, color: Ux4gDefenseTheme.mhaNavy),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: Text(
                      'Protected under Mental Healthcare Act 2017 §21. Your voluntary self-ratings are confidential and cannot be viewed by colleagues.',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14.0),

            // Metrics Form Card
            Ux4gCard(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMetricSlider(
                    title: 'Rest Duration: ${_sleepHours.toStringAsFixed(1)} hours',
                    value: _sleepHours,
                    min: 3.0,
                    max: 12.0,
                    divisions: 18,
                    activeColor: Ux4gDefenseTheme.mhaNavy,
                    onChanged: (v) => setState(() => _sleepHours = v),
                  ),

                  const Divider(),

                  _buildMetricSlider(
                    title: 'Physical Energy: $_energyLevel / 5',
                    value: _energyLevel.toDouble(),
                    min: 1.0,
                    max: 5.0,
                    divisions: 4,
                    activeColor: Ux4gDefenseTheme.defenseGreen,
                    onChanged: (v) => setState(() => _energyLevel = v.toInt()),
                  ),

                  const Divider(),

                  _buildMetricSlider(
                    title: 'Current Emotional Mood: $_moodScore / 5',
                    value: _moodScore.toDouble(),
                    min: 1.0,
                    max: 5.0,
                    divisions: 4,
                    activeColor: Ux4gDefenseTheme.tacticalAmber,
                    onChanged: (v) => setState(() => _moodScore = v.toInt()),
                  ),

                  const Divider(),

                  _buildMetricSlider(
                    title: 'Perceived Stress Level: $_stressLevel / 5',
                    value: _stressLevel.toDouble(),
                    min: 1.0,
                    max: 5.0,
                    divisions: 4,
                    activeColor: _stressLevel >= 4 ? Ux4gDefenseTheme.crisisRed : Ux4gDefenseTheme.mhaNavy,
                    onChanged: (v) => setState(() => _stressLevel = v.toInt()),
                  ),

                  const SizedBox(height: 12.0),

                  const Text(
                    'Optional Personal Note / Remarks:',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8.0),
                  TextField(
                    controller: _noteController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Any physical discomfort, headache, sleep disturbance, or family concerns...',
                    ),
                  ),

                  const SizedBox(height: 20.0),

                  Ux4gButton(
                    label: 'RECORD CONFIDENTIAL ASSESSMENT',
                    icon: Icons.check,
                    type: Ux4gButtonType.primary,
                    isLoading: _isSubmitting,
                    onPressed: _handleSubmit,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricSlider({
    required String title,
    required double value,
    required double min,
    required double max,
    required int divisions,
    required Color activeColor,
    required ValueChanged<double> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
          Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            activeColor: activeColor,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
