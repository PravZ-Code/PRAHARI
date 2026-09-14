class ShiftEntry {
  final String id;
  final String personnelId;
  final String personnelName;
  final String rank;
  final String trade; // Armorer, GD, Driver, Radio Operator, Nursing Asst
  final String unitName;
  final String location;
  final String shiftName; // 00:00-04:00 (Night Sentry), 04:00-08:00 (Dawn Patrol), etc.
  final DateTime shiftDate;
  final int consecutiveNightShifts;
  final double hoursSinceLastDuty;
  final bool isRestCompliant;
  final String riskTag; // green, yellow, orange, red

  ShiftEntry({
    required this.id,
    required this.personnelId,
    required this.personnelName,
    required this.rank,
    required this.trade,
    required this.unitName,
    required this.location,
    required this.shiftName,
    required this.shiftDate,
    required this.consecutiveNightShifts,
    required this.hoursSinceLastDuty,
    required this.isRestCompliant,
    required this.riskTag,
  });

  factory ShiftEntry.fromJson(Map<String, dynamic> json) {
    return ShiftEntry(
      id: json['id'] ?? '',
      personnelId: json['personnel_id'] ?? '',
      personnelName: json['personnel_name'] ?? 'Trooper',
      rank: json['rank'] ?? 'Constable',
      trade: json['trade'] ?? 'General Duty (GD)',
      unitName: json['unit_name'] ?? 'Alpha Company',
      location: json['location'] ?? 'Sentry Post 1',
      shiftName: json['shift_name'] ?? '00:00 - 04:00 (Night)',
      shiftDate: json['shift_date'] != null
          ? DateTime.tryParse(json['shift_date']) ?? DateTime.now()
          : DateTime.now(),
      consecutiveNightShifts: json['consecutive_night_shifts'] ?? 0,
      hoursSinceLastDuty: (json['hours_since_last_duty'] as num?)?.toDouble() ?? 8.0,
      isRestCompliant: json['is_rest_compliant'] ?? true,
      riskTag: json['risk_tag'] ?? 'green',
    );
  }
}

class UROSwapCandidate {
  final String personnelId;
  final String name;
  final String rank;
  final String trade;
  final String currentShift;
  final int consecutiveNights;
  final double restHours;
  final String riskLevel;

  UROSwapCandidate({
    required this.personnelId,
    required this.name,
    required this.rank,
    required this.trade,
    required this.currentShift,
    required this.consecutiveNights,
    required this.restHours,
    required this.riskLevel,
  });

  factory UROSwapCandidate.fromJson(Map<String, dynamic> json) {
    return UROSwapCandidate(
      personnelId: json['personnel_id'] ?? json['id'] ?? '',
      name: json['name'] ?? 'Trooper',
      rank: json['rank'] ?? 'Constable',
      trade: json['trade'] ?? 'General Duty (GD)',
      currentShift: json['current_shift'] ?? json['shift_name'] ?? 'Night Watch',
      consecutiveNights: json['consecutive_nights'] ?? json['consecutive_night_shifts'] ?? 0,
      restHours: (json['rest_hours'] as num?)?.toDouble() ?? (json['hours_since_last_duty'] as num?)?.toDouble() ?? 8.0,
      riskLevel: json['risk_level'] ?? 'green',
    );
  }
}

class UROSwapProposal {
  final String id;
  final String unitId;
  final String trade;
  final UROSwapCandidate tiredTroop; // Person A (High fatigue / 3+ night watches)
  final UROSwapCandidate restedPeer; // Person B (Well-rested equal-trade peer)
  final double riskReductionPct;
  final String rationale;
  final bool commanderApproved;
  final bool welfareApproved;
  final bool rosterCommitted;
  final String status; // proposed, approved, committed

  UROSwapProposal({
    required this.id,
    required this.unitId,
    required this.trade,
    required this.tiredTroop,
    required this.restedPeer,
    required this.riskReductionPct,
    required this.rationale,
    required this.commanderApproved,
    required this.welfareApproved,
    required this.rosterCommitted,
    required this.status,
  });

  factory UROSwapProposal.fromJson(Map<String, dynamic> json) {
    return UROSwapProposal(
      id: json['id'] ?? json['run_id'] ?? 'swap_${DateTime.now().millisecondsSinceEpoch}',
      unitId: json['unit_id'] ?? 'alpha-srinagar-01',
      trade: json['trade'] ?? 'General Duty (GD)',
      tiredTroop: UROSwapCandidate.fromJson(json['person_a'] ?? {
        'name': 'Ct. Rajesh Kumar',
        'rank': 'Constable',
        'trade': 'Armorer',
        'current_shift': '00:00 - 04:00 (Night Sentry)',
        'consecutive_nights': 3,
        'rest_hours': 4.5,
        'risk_level': 'red',
      }),
      restedPeer: UROSwapCandidate.fromJson(json['person_b'] ?? {
        'name': 'Ct. Amit Verma',
        'rank': 'Constable',
        'trade': 'Armorer',
        'current_shift': '12:00 - 16:00 (Day Reserve)',
        'consecutive_nights': 0,
        'rest_hours': 14.0,
        'risk_level': 'green',
      }),
      riskReductionPct: (json['risk_reduction_pct'] as num?)?.toDouble() ?? 24.5,
      rationale: json['rationale'] ??
          'Matches identical trade (Armorer). Swaps night watch to ensure 8-hour continuous circadian rest barrier.',
      commanderApproved: json['commander_approved'] ?? false,
      welfareApproved: json['welfare_approved'] ?? false,
      rosterCommitted: json['roster_committed'] ?? false,
      status: json['status'] ?? 'proposed',
    );
  }
}
