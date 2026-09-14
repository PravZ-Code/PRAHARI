import 'dart:math';
import 'package:flutter/material.dart';

class TrendChart extends StatelessWidget {
  final List<Map<String, dynamic>> points;
  final double height;

  const TrendChart({
    super.key,
    required this.points,
    this.height = 140,
  });

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      // Default placeholder 14-day wave if backend has not returned points yet
      final defaultPoints = [
        {'risk_score': 0.22},
        {'risk_score': 0.28},
        {'risk_score': 0.25},
        {'risk_score': 0.35},
        {'risk_score': 0.30},
        {'risk_score': 0.45},
        {'risk_score': 0.40},
        {'risk_score': 0.32},
        {'risk_score': 0.28},
        {'risk_score': 0.24},
      ];
      return SizedBox(
        height: height,
        child: CustomPaint(
          painter: _TrendPainter(points: defaultPoints),
          size: Size.infinite,
        ),
      );
    }

    return SizedBox(
      height: height,
      child: CustomPaint(
        painter: _TrendPainter(points: points),
        size: Size.infinite,
      ),
    );
  }
}

class _TrendPainter extends CustomPainter {
  final List<Map<String, dynamic>> points;

  _TrendPainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final double width = size.width;
    final double height = size.height;
    const double paddingBottom = 20.0;
    const double paddingTop = 10.0;
    final double chartHeight = height - paddingBottom - paddingTop;

    // 1. Grid Lines
    final gridPaint = Paint()
      ..color = const Color(0xFF334155).withOpacity(0.4)
      ..strokeWidth = 1.0;

    for (int i = 0; i <= 3; i++) {
      final y = paddingTop + (chartHeight * (i / 3.0));
      canvas.drawLine(Offset(0, y), Offset(width, y), gridPaint);
    }

    // 2. Extract values
    final values = points.map((p) {
      final score = p['risk_score'];
      if (score is num) return score.toDouble();
      return 0.20;
    }).toList();

    final int count = values.length;
    final double dx = count > 1 ? width / (count - 1) : width;

    final path = Path();
    final fillPath = Path();

    final List<Offset> offsets = [];
    for (int i = 0; i < count; i++) {
      final val = min(1.0, max(0.0, values[i]));
      // Higher score = closer to top (0 is bottom of chart area)
      final y = paddingTop + (chartHeight * (1.0 - val));
      final x = i * dx;
      offsets.add(Offset(x, y));
      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, height - paddingBottom);
        fillPath.lineTo(x, y);
      } else {
        // Smooth cubic bezier
        final prev = offsets[i - 1];
        final midX = (prev.dx + x) / 2;
        path.cubicTo(midX, prev.dy, midX, y, x, y);
        fillPath.cubicTo(midX, prev.dy, midX, y, x, y);
      }
    }

    fillPath.lineTo(offsets.last.dx, height - paddingBottom);
    fillPath.close();

    // 3. Draw Gradient Fill
    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          const Color(0xFF10B981).withOpacity(0.35),
          const Color(0xFF10B981).withOpacity(0.0),
        ],
      ).createShader(Rect.fromLTWH(0, paddingTop, width, chartHeight));
    canvas.drawPath(fillPath, fillPaint);

    // 4. Draw Line Stroke
    final linePaint = Paint()
      ..color = const Color(0xFF10B981)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, linePaint);

    // 5. Highlight Latest Data Point
    if (offsets.isNotEmpty) {
      final latest = offsets.last;
      final glowPaint = Paint()
        ..color = const Color(0xFF10B981).withOpacity(0.4)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(latest, 8, glowPaint);

      final dotPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawCircle(latest, 4, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _TrendPainter oldDelegate) {
    return oldDelegate.points != points;
  }
}
