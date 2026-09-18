class AssessmentModel {
  final String? id;
  final int sleepQuality;
  final double sleepHours;
  final int moodScore;
  final int energyLevel;
  final int stressLevel;
  final int appetiteScore;
  final int socialConnection;
  final String? freeText;
  final bool isOfflineEntry;
  final DateTime assessedAt;

  AssessmentModel({
    this.id,
    required this.sleepQuality,
    required this.sleepHours,
    required this.moodScore,
    required this.energyLevel,
    required this.stressLevel,
    required this.appetiteScore,
    required this.socialConnection,
    this.freeText,
    this.isOfflineEntry = false,
    required this.assessedAt,
  });

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'sleep_quality': sleepQuality,
      'sleep_hours': sleepHours,
      'mood_score': moodScore,
      'energy_level': energyLevel,
      'stress_level': stressLevel,
      'appetite_score': appetiteScore,
      'social_connection': socialConnection,
      'free_text': freeText,
      'is_offline_entry': isOfflineEntry,
      'assessed_at': assessedAt.toIso8601String(),
    };
  }

  factory AssessmentModel.fromJson(Map<String, dynamic> json) {
    return AssessmentModel(
      id: json['id']?.toString(),
      sleepQuality: (json['sleep_quality'] as num?)?.toInt() ?? 3,
      sleepHours: (json['sleep_hours'] as num?)?.toDouble() ?? 6.0,
      moodScore: (json['mood_score'] as num?)?.toInt() ?? 3,
      energyLevel: (json['energy_level'] as num?)?.toInt() ?? 3,
      stressLevel: (json['stress_level'] as num?)?.toInt() ?? 3,
      appetiteScore: (json['appetite_score'] as num?)?.toInt() ?? 3,
      socialConnection: (json['social_connection'] as num?)?.toInt() ?? 3,
      freeText: json['free_text']?.toString(),
      isOfflineEntry: json['is_offline_entry'] ?? false,
      assessedAt: json['assessed_at'] != null 
          ? (DateTime.tryParse(json['assessed_at'].toString()) ?? DateTime.now())
          : DateTime.now(),
    );
  }
}
