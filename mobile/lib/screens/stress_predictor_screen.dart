import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/stress_predictor_provider.dart';
import '../providers/dashboard_provider.dart';
import '../models/stress_prediction.dart';
import '../models/assessment_model.dart';
import '../widgets/stress_gauge.dart';
import '../widgets/tactical_alert_banner.dart';

class StressPredictorScreen extends StatelessWidget {
  const StressPredictorScreen({super.key});

  void _showSosConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, color: Color(0xFFEF4444)),
            SizedBox(width: 8),
            Text('Welfare SOS Request', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: const Text(
          'This will trigger an urgent confidential welfare case under Section 21 MHCA 2017 with guaranteed 4-hour welfare officer response. Your commanding officer will NOT see clinical notes.',
          style: TextStyle(color: Colors.white70, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<DashboardProvider>().triggerSos(
                'Confidential SOS assistance requested via mobile Prahari Bandhu predictor alert.',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    content: Text(
                      success
                          ? 'Welfare Officer notified with highest priority (4h SLA active).'
                          : 'SOS signal logged locally for offline sync.',
                    ),
                  ),
                );
              }
            },
            child: const Text('Confirm SOS', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

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
      freeText: 'Generated from interactive mobile stress predictor (${predictor.stressPercentage}%)',
      assessedAt: DateTime.now(),
    );

    final success = await dash.submitAssessment(model);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          content: Text(
            success
                ? 'Prediction synced to official battalion welfare profile!'
                : 'Could not sync to backend: ${dash.errorMessage ?? "Check network"}',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final predictor = context.watch<StressPredictorProvider>();
    final pred = predictor.currentPrediction;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'FATIGUE & STRESS PREDICTOR',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Real-Time Tactical Health & Circadian Monitor',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        children: [
          // 1. Simulation Presets Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SIMULATION SCENARIOS',
                  style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _PresetChip(
                        label: 'Optimal Rest',
                        color: const Color(0xFF10B981),
                        isSelected: predictor.category == RiskCategory.low,
                        onTap: () => predictor.applyPreset('optimal'),
                      ),
                      const SizedBox(width: 8),
                      _PresetChip(
                        label: 'Moderate Alert',
                        color: const Color(0xFFFBBF24),
                        isSelected: predictor.category == RiskCategory.moderate,
                        onTap: () => predictor.applyPreset('moderate'),
                      ),
                      const SizedBox(width: 8),
                      _PresetChip(
                        label: 'High Fatigue',
                        color: const Color(0xFFF97316),
                        isSelected: predictor.category == RiskCategory.high,
                        onTap: () => predictor.applyPreset('high'),
                      ),
                      const SizedBox(width: 8),
                      _PresetChip(
                        label: 'Critical Alert',
                        color: const Color(0xFFEF4444),
                        isSelected: predictor.category == RiskCategory.critical,
                        onTap: () => predictor.applyPreset('critical'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Main Stress Gauge Card
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.7),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Center(
              child: StressGauge(
                percentage: predictor.stressPercentage,
                category: predictor.category,
                size: 240,
              ),
            ),
          ),

          // 3. Proactive Alert Banner (if Risky or Critical)
          if (predictor.isRisky) ...[
            const SizedBox(height: 12),
            TacticalAlertBanner(
              category: predictor.category,
              percentage: predictor.stressPercentage,
              onTriggerSos: () => _showSosConfirmation(context),
              onOpenLeave: () {
                // Navigate to leave tab or pop
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Navigate to the "Leave" tab to file emergency leave')),
                );
              },
            ),
          ],

          const SizedBox(height: 16),

          // 4. Circadian & Sleep Stats Cards
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withOpacity(0.7),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.bedtime_outlined, color: Color(0xFF60A5FA), size: 16),
                            SizedBox(width: 6),
                            Text('Sleep Debt', style: TextStyle(color: Colors.white60, fontSize: 11)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${pred.sleepDebtHours} hrs',
                          style: TextStyle(
                            color: pred.sleepDebtHours > 2.0 ? const Color(0xFFEF4444) : Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          pred.sleepDebtHours > 0 ? 'Below 7.5h barrier' : 'Fully rested',
                          style: const TextStyle(color: Colors.white38, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withOpacity(0.7),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.timelapse_outlined, color: Color(0xFFFBBF24), size: 16),
                            SizedBox(width: 6),
                            Text('Circadian Strain', style: TextStyle(color: Colors.white60, fontSize: 11)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${pred.circadianStrain} / 10',
                          style: TextStyle(
                            color: pred.circadianStrain >= 6.0 ? const Color(0xFFEF4444) : Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          pred.circadianStrain >= 6.0 ? 'Disrupted rhythm' : 'Balanced rhythm',
                          style: const TextStyle(color: Colors.white38, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 5. Interactive Parameter Controls
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
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
                      'TACTICAL PARAMETER CONTROLS',
                      style: TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                    Icon(Icons.tune, color: Color(0xFF10B981), size: 18),
                  ],
                ),
                const SizedBox(height: 16),

                // Slider 1: Consecutive Night Shifts
                _SliderRow(
                  title: 'Consecutive Night Shifts',
                  valueDisplay: '${predictor.consecutiveNightShifts} shifts',
                  value: predictor.consecutiveNightShifts.toDouble(),
                  min: 0,
                  max: 7,
                  divisions: 7,
                  activeColor: predictor.consecutiveNightShifts >= 3
                      ? const Color(0xFFEF4444)
                      : const Color(0xFF10B981),
                  onChanged: (val) => predictor.setNightShifts(val.round()),
                ),
                const Divider(color: Color(0xFF334155), height: 24),

                // Slider 2: Sleep Hours
                _SliderRow(
                  title: 'Sleep in Last 24 Hours',
                  valueDisplay: '${predictor.sleepHours} hrs',
                  value: predictor.sleepHours,
                  min: 2.0,
                  max: 12.0,
                  divisions: 20,
                  activeColor: predictor.sleepHours < 5.0
                      ? const Color(0xFFEF4444)
                      : const Color(0xFF10B981),
                  onChanged: (val) => predictor.setSleepHours(val),
                ),
                const Divider(color: Color(0xFF334155), height: 24),

                // Slider 3: Perceived Duty Stress
                _SliderRow(
                  title: 'Perceived Duty Stress (1-5)',
                  valueDisplay: '${predictor.perceivedStress} / 5',
                  value: predictor.perceivedStress.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  activeColor: predictor.perceivedStress >= 4
                      ? const Color(0xFFEF4444)
                      : const Color(0xFF10B981),
                  onChanged: (val) => predictor.setPerceivedStress(val.round()),
                ),
                const Divider(color: Color(0xFF334155), height: 24),

                // Slider 4: Physical Energy Level
                _SliderRow(
                  title: 'Physical Energy Level (1-5)',
                  valueDisplay: '${predictor.energyLevel} / 5',
                  value: predictor.energyLevel.toDouble(),
                  min: 1,
                  max: 5,
                  divisions: 4,
                  activeColor: predictor.energyLevel <= 2
                      ? const Color(0xFFEF4444)
                      : const Color(0xFF10B981),
                  onChanged: (val) => predictor.setEnergyLevel(val.round()),
                ),
                const Divider(color: Color(0xFF334155), height: 24),

                // Slider 5: Days Without 24h Off
                _SliderRow(
                  title: 'Days Without 24h Off-Duty',
                  valueDisplay: '${predictor.daysWithoutOff} days',
                  value: predictor.daysWithoutOff.toDouble(),
                  min: 0,
                  max: 30,
                  divisions: 30,
                  activeColor: predictor.daysWithoutOff >= 14
                      ? const Color(0xFFEF4444)
                      : const Color(0xFF10B981),
                  onChanged: (val) => predictor.setDaysWithoutOff(val.round()),
                ),
                const Divider(color: Color(0xFF334155), height: 24),

                // Deployment Zone Selector
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Operational Zone / Theater',
                      style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        ChoiceChip(
                          label: const Text('High Altitude (Srinagar/Leh)'),
                          selected: predictor.deploymentZone == 'hard_altitude',
                          selectedColor: const Color(0xFF047857),
                          labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                          onSelected: (_) => predictor.setDeploymentZone('hard_altitude'),
                        ),
                        ChoiceChip(
                          label: const Text('Jungle Warfare (Sukma LWE)'),
                          selected: predictor.deploymentZone == 'hard_jungle',
                          selectedColor: const Color(0xFFB45309),
                          labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                          onSelected: (_) => predictor.setDeploymentZone('hard_jungle'),
                        ),
                        ChoiceChip(
                          label: const Text('Peace Station (Hyderabad)'),
                          selected: predictor.deploymentZone == 'peace',
                          selectedColor: const Color(0xFF1D4ED8),
                          labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                          onSelected: (_) => predictor.setDeploymentZone('peace'),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 6. Explainable AI Contributing Factors
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
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
                  children: [
                    Icon(Icons.analytics_outlined, color: Color(0xFF60A5FA), size: 18),
                    SizedBox(width: 8),
                    Text(
                      'PRIMARY RISK DRIVERS (XAI ATTRIBUTION)',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (pred.factors.isEmpty)
                  const Text(
                    'No significant negative strain factors detected. Baseline rest compliance maintained.',
                    style: TextStyle(color: Colors.white60, fontSize: 12),
                  )
                else
                  ...pred.factors.map((f) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  f.name,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                                Text(
                                  '+${f.contributionPct}%',
                                  style: const TextStyle(
                                    color: Color(0xFFF97316),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: f.contributionPct / 100.0,
                                backgroundColor: const Color(0xFF334155),
                                valueColor: const AlwaysStoppedAnimation(Color(0xFFF97316)),
                                minHeight: 6,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              f.description,
                              style: const TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                          ],
                        ),
                      )),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 7. Tactical Mitigation Advice
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
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
                  children: [
                    Icon(Icons.health_and_safety_outlined, color: Color(0xFF10B981), size: 18),
                    SizedBox(width: 8),
                    Text(
                      'RECOMMENDED OPERATIONAL ACTIONS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...pred.recommendedActions.map((action) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.check, color: Color(0xFF10B981), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              action,
                              style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // 8. Sync Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ElevatedButton.icon(
              onPressed: () => _syncToOfficialAssessment(context, predictor),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.cloud_upload_outlined),
              label: const Text(
                'COMMIT TO OFFICIAL BATTALION PROFILE',
                style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8),
              ),
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _PresetChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _PresetChip({
    required this.label,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.25) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? color : const Color(0xFF334155),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(shape: BoxShape.circle, color: color),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.white70,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SliderRow extends StatelessWidget {
  final String title;
  final String valueDisplay;
  final double value;
  final double min;
  final double max;
  final int divisions;
  final Color activeColor;
  final ValueChanged<double> onChanged;

  const _SliderRow({
    required this.title,
    required this.valueDisplay,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.activeColor,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: activeColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: activeColor.withOpacity(0.4)),
              ),
              child: Text(
                valueDisplay,
                style: TextStyle(color: activeColor, fontSize: 12, fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: activeColor,
            thumbColor: activeColor,
            overlayColor: activeColor.withOpacity(0.2),
            inactiveTrackColor: const Color(0xFF334155),
            trackHeight: 4,
          ),
          child: Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }
}
