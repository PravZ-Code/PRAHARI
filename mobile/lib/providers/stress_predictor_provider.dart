import 'package:flutter/foundation.dart';
import '../models/stress_prediction.dart';
import '../services/stress_engine.dart';

class StressPredictorProvider with ChangeNotifier {
  // Input parameters
  int _consecutiveNightShifts = 2;
  double _sleepHours = 5.5;
  int _perceivedStress = 3;
  int _energyLevel = 3;
  int _moodScore = 3;
  int _daysWithoutOff = 10;
  String _deploymentZone = 'hard_altitude'; // 'hard_altitude', 'hard_jungle', 'peace'
  int _socialConnection = 3;

  late StressPredictionResult _currentPrediction;

  StressPredictorProvider() {
    _recalculate();
  }

  // Getters
  int get consecutiveNightShifts => _consecutiveNightShifts;
  double get sleepHours => _sleepHours;
  int get perceivedStress => _perceivedStress;
  int get energyLevel => _energyLevel;
  int get moodScore => _moodScore;
  int get daysWithoutOff => _daysWithoutOff;
  String get deploymentZone => _deploymentZone;
  int get socialConnection => _socialConnection;

  StressPredictionResult get currentPrediction => _currentPrediction;
  int get stressPercentage => _currentPrediction.percentage;
  RiskCategory get category => _currentPrediction.category;
  bool get isRisky => _currentPrediction.isRisky;
  bool get isCritical => _currentPrediction.category == RiskCategory.critical;

  void _recalculate() {
    _currentPrediction = StressEngine.predict(
      consecutiveNightShifts: _consecutiveNightShifts,
      sleepHours: _sleepHours,
      perceivedStress: _perceivedStress,
      energyLevel: _energyLevel,
      moodScore: _moodScore,
      daysWithoutOff: _daysWithoutOff,
      deploymentZone: _deploymentZone,
      socialConnection: _socialConnection,
    );
    notifyListeners();
  }

  // Setters with auto-recalculation
  void setNightShifts(int val) {
    _consecutiveNightShifts = val;
    _recalculate();
  }

  void setSleepHours(double val) {
    _sleepHours = double.parse(val.toStringAsFixed(1));
    _recalculate();
  }

  void setPerceivedStress(int val) {
    _perceivedStress = val;
    _recalculate();
  }

  void setEnergyLevel(int val) {
    _energyLevel = val;
    _recalculate();
  }

  void setMoodScore(int val) {
    _moodScore = val;
    _recalculate();
  }

  void setDaysWithoutOff(int val) {
    _daysWithoutOff = val;
    _recalculate();
  }

  void setDeploymentZone(String zone) {
    _deploymentZone = zone;
    _recalculate();
  }

  void setSocialConnection(int val) {
    _socialConnection = val;
    _recalculate();
  }

  // Presets for instant simulation & demonstrations
  void applyPreset(String preset) {
    switch (preset) {
      case 'critical': // High Risk Simulation
        _consecutiveNightShifts = 4;
        _sleepHours = 3.5;
        _perceivedStress = 5;
        _energyLevel = 1;
        _moodScore = 2;
        _daysWithoutOff = 18;
        _deploymentZone = 'hard_jungle';
        _socialConnection = 1;
        break;

      case 'high': // High Risk Warning
        _consecutiveNightShifts = 3;
        _sleepHours = 4.5;
        _perceivedStress = 4;
        _energyLevel = 2;
        _moodScore = 2;
        _daysWithoutOff = 14;
        _deploymentZone = 'hard_altitude';
        _socialConnection = 2;
        break;

      case 'moderate': // Moderate Alert
        _consecutiveNightShifts = 2;
        _sleepHours = 6.0;
        _perceivedStress = 3;
        _energyLevel = 3;
        _moodScore = 3;
        _daysWithoutOff = 8;
        _deploymentZone = 'hard_altitude';
        _socialConnection = 3;
        break;

      case 'optimal': // Optimal Rest
      default:
        _consecutiveNightShifts = 0;
        _sleepHours = 8.0;
        _perceivedStress = 1;
        _energyLevel = 5;
        _moodScore = 5;
        _daysWithoutOff = 2;
        _deploymentZone = 'peace';
        _socialConnection = 4;
        break;
    }
    _recalculate();
  }
}
