import 'package:flutter/foundation.dart';
import '../models/assessment_model.dart';
import '../models/grievance_model.dart';
import '../models/stress_prediction.dart';
import '../services/api_service.dart';

class DashboardProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String? _errorMessage;

  // Personal Dashboard Data - defaults to generic neutral values
  String _soldierName = '';
  String _soldierRank = '';
  String _personnelId = '';
  int _stressPercentage = 20;
  RiskCategory _riskCategory = RiskCategory.low;
  double _confidence = 0.80;
  List<Map<String, dynamic>> _riskTrend = [];
  int _assessmentsSubmitted = 0;
  int _daysUntilPersonalized = 90;

  // Grievance / Request Data
  List<GrievanceModel> _activeGrievances = [];

  // Rest Barrier (SO-04)
  double _hoursSinceLastDuty = 8.5; // Compliant default

  // Getters
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get soldierName => _soldierName.isNotEmpty ? _soldierName : 'Trooper';
  String get soldierRank => _soldierRank.isNotEmpty ? _soldierRank : 'Constable';
  String get personnelId => _personnelId;
  int get stressPercentage => _stressPercentage;
  RiskCategory get riskCategory => _riskCategory;
  double get confidence => _confidence;
  List<Map<String, dynamic>> get riskTrend => _riskTrend;
  int get assessmentsSubmitted => _assessmentsSubmitted;
  int get daysUntilPersonalized => _daysUntilPersonalized;
  List<GrievanceModel> get activeGrievances => _activeGrievances;
  double get hoursSinceLastDuty => _hoursSinceLastDuty;
  bool get isRestCompliant => _hoursSinceLastDuty >= 8.0;
  bool get isRisky => _riskCategory == RiskCategory.high || _riskCategory == RiskCategory.critical;

  void resetState() {
    _isLoading = false;
    _errorMessage = null;
    _soldierName = '';
    _soldierRank = '';
    _personnelId = '';
    _stressPercentage = 20;
    _riskCategory = RiskCategory.low;
    _confidence = 0.80;
    _riskTrend = [];
    _assessmentsSubmitted = 0;
    _daysUntilPersonalized = 90;
    _activeGrievances = [];
    _hoursSinceLastDuty = 8.5;
    notifyListeners();
  }

  Future<void> loadDashboard() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _apiService.getPersonalDashboard();
      _personnelId = data['personnel_id'] ?? '';
      _soldierName = data['name'] ?? 'Personnel';
      _soldierRank = data['rank'] ?? 'Constable';
      _assessmentsSubmitted = data['assessments_submitted'] ?? 0;
      _daysUntilPersonalized = data['days_until_personalized'] ?? 90;

      final currentRisk = data['current_risk'] ?? {};
      final double score = (currentRisk['risk_score'] as num?)?.toDouble() ?? 0.20;
      _stressPercentage = (score * 100).round();
      _confidence = (currentRisk['confidence'] as num?)?.toDouble() ?? 0.80;

      final String levelStr = currentRisk['risk_level'] ?? 'green';
      switch (levelStr.toLowerCase()) {
        case 'red':
          _riskCategory = RiskCategory.critical;
          break;
        case 'orange':
          _riskCategory = RiskCategory.high;
          break;
        case 'yellow':
          _riskCategory = RiskCategory.moderate;
          break;
        case 'green':
        default:
          _riskCategory = RiskCategory.low;
          break;
      }

      final trendList = data['risk_trend'];
      if (trendList is List) {
        _riskTrend = List<Map<String, dynamic>>.from(trendList);
      }

      await loadGrievances();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadGrievances() async {
    try {
      final list = await _apiService.getMyGrievances();
      _activeGrievances = list.map((item) => GrievanceModel.fromJson(item)).toList();
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> submitAssessment(AssessmentModel model) async {
    try {
      await _apiService.submitAssessment(model);
      await loadDashboard();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> submitPersonnelRequest({
    required String requestType,
    required String category,
    required String description,
    String? startDate,
    String? endDate,
  }) async {
    try {
      await _apiService.submitPersonnelRequest(
        requestType: requestType,
        category: category,
        description: description,
        startDate: startDate,
        endDate: endDate,
      );
      await loadGrievances();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> submitEmergencyLeave({
    required String category,
    required String description,
    String? startDate,
    String? endDate,
  }) async {
    return submitPersonnelRequest(
      requestType: 'leave',
      category: category,
      description: description,
      startDate: startDate,
      endDate: endDate,
    );
  }

  Future<bool> triggerSos(String message) async {
    try {
      await _apiService.submitHelpRequest(message);
      _stressPercentage = 92;
      _riskCategory = RiskCategory.critical;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }
}
