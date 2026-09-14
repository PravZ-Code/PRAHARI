class UserModel {
  final String id;
  final String username;
  final String role;
  final String? personnelId;
  final String? unitId;
  final String? name;
  final String? rank;
  final String? unitName;
  final String? serviceNumber;

  UserModel({
    required this.id,
    required this.username,
    required this.role,
    this.personnelId,
    this.unitId,
    this.name,
    this.rank,
    this.unitName,
    this.serviceNumber,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      role: json['role'] ?? 'personnel',
      personnelId: json['personnel_id'],
      unitId: json['unit_id'],
      name: json['name'],
      rank: json['rank'],
      unitName: json['unit_name'],
      serviceNumber: json['service_number'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'role': role,
      'personnel_id': personnelId,
      'unit_id': unitId,
      'name': name,
      'rank': rank,
      'unit_name': unitName,
      'service_number': serviceNumber,
    };
  }

  bool get isPersonnel => role == 'personnel' || role == 'jawan';
  bool get isCommander => role == 'commander';
  bool get isWelfare => role == 'welfare';
  bool get isAdmin => role == 'admin';
}

class PersonnelProfile {
  final String id;
  final String serviceNumber;
  final String name;
  final String rank;
  final String trade;
  final String company;
  final String contactNumber;
  final String unitId;
  final String unitName;
  final String formation;
  final String operationalArea;
  final String dateOfJoining;
  final String currentPostingDate;
  final int hardAreaMonths;
  final int totalTransfers;

  PersonnelProfile({
    required this.id,
    required this.serviceNumber,
    required this.name,
    required this.rank,
    required this.trade,
    required this.company,
    required this.contactNumber,
    required this.unitId,
    required this.unitName,
    required this.formation,
    required this.operationalArea,
    required this.dateOfJoining,
    required this.currentPostingDate,
    required this.hardAreaMonths,
    required this.totalTransfers,
  });

  factory PersonnelProfile.fromJson(Map<String, dynamic> json) {
    return PersonnelProfile(
      id: json['id'] ?? '',
      serviceNumber: json['service_number'] ?? '',
      name: json['name'] ?? '',
      rank: json['rank'] ?? 'Constable',
      trade: json['trade'] ?? 'GD',
      company: json['company'] ?? 'Alpha Company',
      contactNumber: json['contact_number'] ?? '',
      unitId: json['unit_id'] ?? '',
      unitName: json['unit_name'] ?? 'Battalion HQ',
      formation: json['formation'] ?? 'Field Force',
      operationalArea: json['operational_area'] ?? 'General',
      dateOfJoining: json['date_of_joining'] ?? '',
      currentPostingDate: json['current_posting_date'] ?? '',
      hardAreaMonths: (json['hard_area_months'] as num?)?.toInt() ?? 0,
      totalTransfers: (json['total_transfers'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'service_number': serviceNumber,
      'name': name,
      'rank': rank,
      'trade': trade,
      'company': company,
      'contact_number': contactNumber,
      'unit_id': unitId,
      'unit_name': unitName,
      'formation': formation,
      'operational_area': operationalArea,
      'date_of_joining': dateOfJoining,
      'current_posting_date': currentPostingDate,
      'hard_area_months': hardAreaMonths,
      'total_transfers': totalTransfers,
    };
  }

  PersonnelProfile copyWith({
    String? name,
    String? rank,
    String? trade,
    String? company,
    String? contactNumber,
    String? dateOfJoining,
    String? currentPostingDate,
    int? hardAreaMonths,
    int? totalTransfers,
  }) {
    return PersonnelProfile(
      id: id,
      serviceNumber: serviceNumber,
      name: name ?? this.name,
      rank: rank ?? this.rank,
      trade: trade ?? this.trade,
      company: company ?? this.company,
      contactNumber: contactNumber ?? this.contactNumber,
      unitId: unitId,
      unitName: unitName,
      formation: formation,
      operationalArea: operationalArea,
      dateOfJoining: dateOfJoining ?? this.dateOfJoining,
      currentPostingDate: currentPostingDate ?? this.currentPostingDate,
      hardAreaMonths: hardAreaMonths ?? this.hardAreaMonths,
      totalTransfers: totalTransfers ?? this.totalTransfers,
    );
  }
}
