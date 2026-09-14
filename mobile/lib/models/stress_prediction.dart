import 'package:flutter/material.dart';

enum RiskCategory {
  low,
  moderate,
  high,
  critical,
}

extension RiskCategoryExtension on RiskCategory {
  String get displayName {
    switch (this) {
      case RiskCategory.low:
        return 'LOW RISK';
      case RiskCategory.moderate:
        return 'MODERATE RISK';
      case RiskCategory.high:
        return 'HIGH RISK';
      case RiskCategory.critical:
        return 'CRITICAL RISK';
    }
  }

  String get operationalTag {
    switch (this) {
      case RiskCategory.low:
        return 'Rest Compliant (Ready)';
      case RiskCategory.moderate:
        return 'Elevated Fatigue (Monitor)';
      case RiskCategory.high:
        return 'Needs Rest Rotation';
      case RiskCategory.critical:
        return 'Immediate Relief Required';
    }
  }

  Color get color {
    switch (this) {
      case RiskCategory.low:
        return const Color(0xFF10B981); // Emerald Green
      case RiskCategory.moderate:
        return const Color(0xFFFBBF24); // Amber Yellow
      case RiskCategory.high:
        return const Color(0xFFF97316); // Flame Orange
      case RiskCategory.critical:
        return const Color(0xFFEF4444); // Crimson Red
    }
  }

  Color get backgroundColor {
    switch (this) {
      case RiskCategory.low:
        return const Color(0xFF064E3B).withOpacity(0.3);
      case RiskCategory.moderate:
        return const Color(0xFF78350F).withOpacity(0.3);
      case RiskCategory.high:
        return const Color(0xFF7C2D12).withOpacity(0.3);
      case RiskCategory.critical:
        return const Color(0xFF7F1D1D).withOpacity(0.3);
    }
  }

  IconData get icon {
    switch (this) {
      case RiskCategory.low:
        return Icons.check_circle_outline;
      case RiskCategory.moderate:
        return Icons.info_outline;
      case RiskCategory.high:
        return Icons.warning_amber_rounded;
      case RiskCategory.critical:
        return Icons.dangerous_outlined;
    }
  }
}

class ContributingFactor {
  final String name;
  final double contributionPct;
  final String description;
  final bool isNegative;

  ContributingFactor({
    required this.name,
    required this.contributionPct,
    required this.description,
    this.isNegative = true,
  });
}

class StressPredictionResult {
  final double score; // 0.0 to 1.0
  final int percentage; // 0 to 100%
  final RiskCategory category;
  final double circadianStrain;
  final double sleepDebtHours;
  final List<ContributingFactor> factors;
  final List<String> recommendedActions;
  final DateTime calculatedAt;

  StressPredictionResult({
    required this.score,
    required this.percentage,
    required this.category,
    required this.circadianStrain,
    required this.sleepDebtHours,
    required this.factors,
    required this.recommendedActions,
    required this.calculatedAt,
  });

  bool get isRisky => category == RiskCategory.high || category == RiskCategory.critical;
}
