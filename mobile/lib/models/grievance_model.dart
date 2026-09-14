class GrievanceModel {
  final String id;
  final String personnelId;
  final String? personnelName;
  final String? rank;
  final String? unitName;
  final String requestType;
  final String category;
  final String? description;
  final String? startDate;
  final String? endDate;
  final bool isFastLane;
  final String status;
  final DateTime filedAt;
  final int slaDeadlineHours;
  final DateTime slaDeadline;
  final bool slaBreached;
  final double hoursRemaining;
  final int escalationLevel;
  final String? resolutionNotes;
  final String? rejectionReason;
  final bool commanderApproved;
  final bool welfareApproved;
  final String? suggestedReplacementName;

  GrievanceModel({
    required this.id,
    required this.personnelId,
    this.personnelName,
    this.rank,
    this.unitName,
    required this.requestType,
    required this.category,
    this.description,
    this.startDate,
    this.endDate,
    required this.isFastLane,
    required this.status,
    required this.filedAt,
    required this.slaDeadlineHours,
    required this.slaDeadline,
    required this.slaBreached,
    required this.hoursRemaining,
    required this.escalationLevel,
    this.resolutionNotes,
    this.rejectionReason,
    this.commanderApproved = false,
    this.welfareApproved = false,
    this.suggestedReplacementName,
  });

  factory GrievanceModel.fromJson(Map<String, dynamic> json) {
    return GrievanceModel(
      id: json['id'] ?? '',
      personnelId: json['personnel_id'] ?? '',
      personnelName: json['personnel_name'],
      rank: json['rank'],
      unitName: json['unit_name'],
      requestType: json['request_type'] ?? 'leave',
      category: json['category'] ?? 'family_emergency',
      description: json['description'],
      startDate: json['start_date'],
      endDate: json['end_date'],
      isFastLane: json['is_fast_lane'] ?? true,
      status: json['status'] ?? 'pending',
      filedAt: json['filed_at'] != null ? DateTime.parse(json['filed_at']) : DateTime.now(),
      slaDeadlineHours: json['sla_deadline_hours'] ?? 72,
      slaDeadline: json['sla_deadline'] != null ? DateTime.parse(json['sla_deadline']) : DateTime.now().add(const Duration(hours: 72)),
      slaBreached: json['sla_breached'] ?? false,
      hoursRemaining: (json['hours_remaining'] as num?)?.toDouble() ?? 72.0,
      escalationLevel: json['escalation_level'] ?? 0,
      resolutionNotes: json['resolution_notes'],
      rejectionReason: json['rejection_reason'],
      commanderApproved: json['commander_approved'] ?? false,
      welfareApproved: json['welfare_approved'] ?? false,
      suggestedReplacementName: json['suggested_replacement_name'],
    );
  }
}
