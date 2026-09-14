class AuditBlock {
  final int sequenceNumber;
  final String previousHash;
  final String currentHash;
  final String user;
  final String role;
  final String action;
  final String resourceType;
  final String resourceId;
  final DateTime timestamp;
  final Map<String, dynamic> details;
  final bool isVerified;

  AuditBlock({
    required this.sequenceNumber,
    required this.previousHash,
    required this.currentHash,
    required this.user,
    required this.role,
    required this.action,
    required this.resourceType,
    required this.resourceId,
    required this.timestamp,
    required this.details,
    this.isVerified = true,
  });

  factory AuditBlock.fromJson(Map<String, dynamic> json) {
    return AuditBlock(
      sequenceNumber: json['sequence_number'] ?? 0,
      previousHash: json['previous_hash'] ?? '0000000000000000000000000000000000000000000000000000000000000000',
      currentHash: json['current_hash'] ?? '',
      user: json['user'] ?? 'system',
      role: json['role'] ?? 'system',
      action: json['action'] ?? 'LOG',
      resourceType: json['resource_type'] ?? 'system',
      resourceId: json['resource_id'] ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp']) ?? DateTime.now()
          : DateTime.now(),
      details: json['details'] is Map<String, dynamic> ? json['details'] : {},
      isVerified: json['is_verified'] ?? true,
    );
  }
  int get id => sequenceNumber;
  String get hash => currentHash;
  String get actorRank => role;
  String get userId => user;
}

class AuditChainVerification {
  final String chainStatus; // 'INTACT' or 'COMPROMISED'
  final int totalBlocks;
  final int? tamperedIndex;
  final String genesisHash;
  final String currentTipHash;
  final DateTime verifiedAt;

  AuditChainVerification({
    required this.chainStatus,
    required this.totalBlocks,
    this.tamperedIndex,
    required this.genesisHash,
    required this.currentTipHash,
    required this.verifiedAt,
  });

  bool get isIntact => chainStatus.toUpperCase() == 'INTACT';
  bool get isValid => isIntact;

  factory AuditChainVerification.fromJson(Map<String, dynamic> json) {
    return AuditChainVerification(
      chainStatus: json['chain_status'] ?? 'INTACT',
      totalBlocks: json['total_blocks'] ?? 0,
      tamperedIndex: json['tampered_index'],
      genesisHash: json['genesis_hash'] ?? '0' * 64,
      currentTipHash: json['current_tip_hash'] ?? 'a3f89e1...chained',
      verifiedAt: DateTime.now(),
    );
  }
}
