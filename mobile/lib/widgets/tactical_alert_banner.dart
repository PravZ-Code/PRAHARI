import 'package:flutter/material.dart';
import '../models/stress_prediction.dart';

class TacticalAlertBanner extends StatefulWidget {
  final RiskCategory category;
  final int percentage;
  final VoidCallback onTriggerSos;
  final VoidCallback onOpenLeave;

  const TacticalAlertBanner({
    super.key,
    required this.category,
    required this.percentage,
    required this.onTriggerSos,
    required this.onOpenLeave,
  });

  @override
  State<TacticalAlertBanner> createState() => _TacticalAlertBannerState();
}

class _TacticalAlertBannerState extends State<TacticalAlertBanner> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isCritical = widget.category == RiskCategory.critical;
    final Color alertColor = isCritical ? const Color(0xFFEF4444) : const Color(0xFFF97316);

    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final double opacity = 0.6 + (_pulseController.value * 0.4);
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isCritical
                ? const Color(0xFF450A0A).withOpacity(0.9)
                : const Color(0xFF431407).withOpacity(0.9),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: alertColor.withOpacity(opacity),
              width: 2.0,
            ),
            boxShadow: [
              BoxShadow(
                color: alertColor.withOpacity(0.25 * _pulseController.value),
                blurRadius: 14,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: alertColor.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isCritical ? Icons.warning_rounded : Icons.info_outline,
                      color: alertColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isCritical
                              ? 'CRITICAL FATIGUE ALERT (${widget.percentage}%)'
                              : 'HIGH STRESS ADVISORY (${widget.percentage}%)',
                          style: TextStyle(
                            color: alertColor,
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'MHA Standing Order SO-04 / Rest Protection',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                isCritical
                    ? 'Cumulative sleep debt & circadian strain exceed safe threshold. Mandatory 8-hour uninterrupted rest gap required before next sentry duty.'
                    : 'Trooper fatigue is significantly elevated. Operational rotation or emergency leave recommended to prevent exhaustion.',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: widget.onOpenLeave,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: alertColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.flight_takeoff, size: 16),
                      label: const Text(
                        '72h Leave',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: widget.onTriggerSos,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: alertColor.withOpacity(0.8)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.shield_outlined, size: 16),
                      label: const Text(
                        'Welfare SOS',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
