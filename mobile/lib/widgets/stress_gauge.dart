import 'dart:math';
import 'package:flutter/material.dart';
import '../models/stress_prediction.dart';

class StressGauge extends StatefulWidget {
  final int percentage; // 0 - 100
  final RiskCategory category;
  final double size;

  const StressGauge({
    super.key,
    required this.percentage,
    required this.category,
    this.size = 220,
  });

  @override
  State<StressGauge> createState() => _StressGaugeState();
}

class _StressGaugeState extends State<StressGauge> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  double _prevPercentage = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _animation = Tween<double>(begin: 0, end: widget.percentage.toDouble()).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );
    _prevPercentage = widget.percentage.toDouble();
    _controller.forward();
  }

  @override
  void didUpdateWidget(StressGauge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.percentage != widget.percentage) {
      _animation = Tween<double>(
        begin: _prevPercentage,
        end: widget.percentage.toDouble(),
      ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
      _prevPercentage = widget.percentage.toDouble();
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.category.color;

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        final currentVal = _animation.value;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: widget.size,
              height: widget.size * 0.75,
              child: CustomPaint(
                painter: _GaugePainter(
                  percentage: currentVal,
                  categoryColor: color,
                ),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${currentVal.round()}%',
                        style: TextStyle(
                          fontSize: widget.size * 0.22,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -1.0,
                        ),
                      ),
                      Text(
                        'STRESS INDEX',
                        style: TextStyle(
                          fontSize: widget.size * 0.055,
                          fontWeight: FontWeight.w700,
                          color: Colors.white54,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Category Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: widget.category.backgroundColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: color.withValues(alpha: 0.5), width: 1.5),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(widget.category.icon, color: color, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    widget.category.displayName,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      letterSpacing: 1.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text(
              widget.category.operationalTag,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double percentage; // 0 - 100
  final Color categoryColor;

  _GaugePainter({required this.percentage, required this.categoryColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.85);
    final radius = size.width * 0.42;
    const startAngle = pi * 0.85; // ~153 degrees
    const totalSweep = pi * 1.30; // ~234 degrees sweep

    // 1. Background Track
    final bgPaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 16.0
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      totalSweep,
      false,
      bgPaint,
    );

    // 2. Color Segment Guides (subtle markers)
    // Low: 0 - 35% (Green)
    // Moderate: 35 - 65% (Yellow)
    // High: 65 - 85% (Orange)
    // Critical: 85 - 100% (Red)
    final clampedPct = min(100.0, max(0.0, percentage));
    final sweepAngle = (clampedPct / 100.0) * totalSweep;

    // 3. Active Colored Arc
    final activePaint = Paint()
      ..color = categoryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 16.0
      ..strokeCap = StrokeCap.round;

    if (sweepAngle > 0.01) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        activePaint,
      );
    }

    // 4. Glow indicator at current head
    final headAngle = startAngle + sweepAngle;
    final headOffset = Offset(
      center.dx + radius * cos(headAngle),
      center.dy + radius * sin(headAngle),
    );

    final glowPaint = Paint()
      ..color = categoryColor.withValues(alpha: 0.4)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(headOffset, 12, glowPaint);

    final dotPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(headOffset, 6, dotPaint);
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) {
    return oldDelegate.percentage != percentage ||
        oldDelegate.categoryColor != categoryColor;
  }
}
