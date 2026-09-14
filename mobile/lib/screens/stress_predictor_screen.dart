import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/stress_predictor_provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../models/assessment_model.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

class StressPredictorScreen extends StatelessWidget {
  const StressPredictorScreen({super.key});

  void _syncToOfficialAssessment(BuildContext context, StressPredictorProvider predictor) async {
    final dash = context.read<DashboardProvider>();
    final model = AssessmentModel(
      sleepQuality: predictor.sleepHours >= 7 ? 4 : (predictor.sleepHours >= 5 ? 3 : 2),
      sleepHours: predictor.sleepHours,
      moodScore: predictor.moodScore,
      energyLevel: predictor.energyLevel,
      stressLevel: predictor.perceivedStress,
      appetiteScore: 3,
      socialConnection: predictor.socialConnection,
      freeText: 'Sync from PRAHARI Bandhu Calibrated Strain Engine (${predictor.stressPercentage}%)',
      assessedAt: DateTime.now(),
    );

    final success = await dash.submitAssessment(model);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: success ? Ux4gDefenseTheme.defenseGreen : Ux4gDefenseTheme.crisisRed,
          content: Text(
            success
                ? 'Clinical assessment synced to secure backend! Protected under Section 21 MHCA 2017.'
                : 'Failed to sync assessment. Saved to local offline queue.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final predictor = context.watch<StressPredictorProvider>();
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;
    final score = predictor.currentPrediction.score;
    final pct = predictor.stressPercentage;

    Color scoreColor;
    String riskLevel;
    Ux4gBadgeType badgeType;

    if (score >= 0.70) {
      scoreColor = Ux4gDefenseTheme.crisisRed;
      riskLevel = 'HIGH OPERATIONAL STRAIN';
      badgeType = Ux4gBadgeType.danger;
    } else if (score >= 0.40) {
      scoreColor = Ux4gDefenseTheme.tacticalAmber;
      riskLevel = 'MODERATE OPERATIONAL STRAIN';
      badgeType = Ux4gBadgeType.warning;
    } else {
      scoreColor = Ux4gDefenseTheme.defenseGreen;
      riskLevel = 'OPTIMAL READINESS';
      badgeType = Ux4gBadgeType.success;
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'CALIBRATED STRAIN & RISK ENGINE',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'Prospective XGBoost & Factor Attribution',
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
            // Gauge & Primary Score Card
            Ux4gCard(
              accentColor: scoreColor,
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'PROSPECTIVE 14-DAY RISK',
                        style: TextStyle(
                          fontSize: 12.0,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                          color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                        ),
                      ),
                      Ux4gBadge(text: riskLevel, type: badgeType),
                    ],
                  ),

                  const SizedBox(height: 18.0),

                  // Score Visualizer
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 140.0,
                        height: 140.0,
                        child: CircularProgressIndicator(
                          value: score,
                          strokeWidth: 12.0,
                          backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                          valueColor: AlwaysStoppedAnimation<Color>(scoreColor),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$pct%',
                            style: TextStyle(
                              fontSize: 34.0,
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : Ux4gDefenseTheme.textPrimaryLight,
                            ),
                          ),
                          Text(
                            'Calibrated',
                            style: TextStyle(
                              fontSize: 11.0,
                              color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 16.0),

                  Text(
                    score >= 0.70
                        ? 'High fatigue accumulation detected. Early rotation or circadian rest is recommended.'
                        : (score >= 0.40
                            ? 'Moderate load detected. Monitored for potential sleep debt accumulation.'
                            : 'Frontline physical and psychological readiness within baseline limits.'),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12.0,
                      color: isDark ? Colors.white70 : Colors.black87,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14.0),

            // Plain-Language Factor Attribution with Source Tags
            Ux4gCard(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Top Operational Catalysts (TreeSHAP)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                  ),
                  const SizedBox(height: 4.0),
                  Text(
                    'Transparent objective catalysts with source verification tags:',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 12.0),

                  _buildCatalystRow(
                    tag: '[HR]',
                    tagColor: Ux4gDefenseTheme.mhaNavy,
                    title: 'Night Shift Density',
                    detail: '${predictor.consecutiveNightShifts} consecutive night shifts (Threshold: 2)',
                    isElevated: predictor.consecutiveNightShifts >= 2,
                  ),
                  const Divider(),
                  _buildCatalystRow(
                    tag: '[Wellness]',
                    tagColor: Ux4gDefenseTheme.defenseGreen,
                    title: 'Circadian Sleep Duration',
                    detail: '${predictor.sleepHours}h average rest (Minimum recommended: 7h)',
                    isElevated: predictor.sleepHours < 6.0,
                  ),
                  const Divider(),
                  _buildCatalystRow(
                    tag: '[Self-Report]',
                    tagColor: Ux4gDefenseTheme.tacticalAmber,
                    title: 'Perceived Subjective Load',
                    detail: 'Score: ${predictor.perceivedStress} / 10',
                    isElevated: predictor.perceivedStress >= 7,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14.0),

            // Interactive Self-Reporting Sliders
            Ux4gCard(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Update Voluntary Check-In Signals',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                  ),
                  const SizedBox(height: 4.0),
                  Text(
                    'Adjust metrics to simulate projected operational strain score:',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: 14.0),

                  Text('Sleep Duration: ${predictor.sleepHours.toStringAsFixed(1)} hours', style: const TextStyle(fontSize: 12.0, fontWeight: FontWeight.w600)),
                  Slider(
                    value: predictor.sleepHours,
                    min: 3.0,
                    max: 10.0,
                    divisions: 14,
                    activeColor: Ux4gDefenseTheme.mhaNavy,
                    onChanged: (v) => predictor.setSleepHours(v),
                  ),

                  Text('Subjective Fatigue: ${predictor.perceivedStress} / 10', style: const TextStyle(fontSize: 12.0, fontWeight: FontWeight.w600)),
                  Slider(
                    value: predictor.perceivedStress.toDouble(),
                    min: 1.0,
                    max: 10.0,
                    divisions: 9,
                    activeColor: Ux4gDefenseTheme.tacticalAmber,
                    onChanged: (v) => predictor.setPerceivedStress(v.toInt()),
                  ),

                  Text('Social / Family Support: ${predictor.socialConnection} / 5', style: const TextStyle(fontSize: 12.0, fontWeight: FontWeight.w600)),
                  Slider(
                    value: predictor.socialConnection.toDouble(),
                    min: 1.0,
                    max: 5.0,
                    divisions: 4,
                    activeColor: Ux4gDefenseTheme.defenseGreen,
                    onChanged: (v) => predictor.setSocialConnection(v.toInt()),
                  ),

                  const SizedBox(height: 14.0),

                  Ux4gButton(
                    label: 'Sync Check-In to Secure Health Record',
                    icon: Icons.cloud_upload_outlined,
                    type: Ux4gButtonType.primary,
                    onPressed: () => _syncToOfficialAssessment(context, predictor),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCatalystRow({
    required String tag,
    required Color tagColor,
    required String title,
    required String detail,
    required bool isElevated,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 2.0),
            decoration: BoxDecoration(
              color: tagColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4.0),
            ),
            child: Text(
              tag,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: tagColor,
              ),
            ),
          ),
          const SizedBox(width: 10.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                const SizedBox(height: 1.0),
                Text(detail, style: const TextStyle(fontSize: 11.5, color: Colors.grey)),
              ],
            ),
          ),
          if (isElevated)
            const Ux4gBadge(text: 'ELEVATED', type: Ux4gBadgeType.danger)
          else
            const Ux4gBadge(text: 'NORMAL', type: Ux4gBadgeType.success),
        ],
      ),
    );
  }
}
