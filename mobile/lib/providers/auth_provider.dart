import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  UserModel? _user;
  PersonnelProfile? _profile;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isBackendConnected = false;

  UserModel? get user => _user;
  PersonnelProfile? get profile => _profile;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isBackendConnected => _isBackendConnected;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    await _apiService.init();
    _isBackendConnected = await _apiService.checkHealth();

    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('current_user_json');
    if (userJson != null) {
      try {
        _user = UserModel.fromJson(jsonDecode(userJson));
        // Verify this app is only for personnel
        if (!_user!.isPersonnel) {
          await logout();
          return;
        }
        await loadProfile();
      } catch (e) {
        await _apiService.clearToken();
        _user = null;
        _profile = null;
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> checkConnection() async {
    _isBackendConnected = await _apiService.checkHealth();
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiService.login(username, password);
      final userMap = res['user'] ?? {};
      final parsedUser = UserModel.fromJson(userMap);

      // Strict requirement: Flutter mobile app is ONLY for personnel
      if (!parsedUser.isPersonnel) {
        await _apiService.clearToken();
        throw Exception(
          'ACCESS DENIED: This mobile terminal is strictly restricted to uniformed Personnel. '
          'Commanders and Welfare Officers must access the authorized Web Command Console.',
        );
      }

      _user = parsedUser;
      _isBackendConnected = true;
      await loadProfile();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _user = null;
      _profile = null;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> loginPersonnelDemo(String personnelKey) async {
    switch (personnelKey.toUpperCase()) {
      case 'B':
      case 'ANKIT':
        return await login('ankit_sharma', 'demo123');
      case 'A':
      case 'RAJESH':
      default:
        return await login('rajesh_kumar', 'demo123');
    }
  }

  Future<void> loadProfile() async {
    try {
      final data = await _apiService.getPersonnelProfile();
      _profile = PersonnelProfile.fromJson(data);
      notifyListeners();
    } catch (_) {
      // Profile can be loaded or updated later
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final updatedJson = await _apiService.updatePersonnelProfile(data);
      _profile = PersonnelProfile.fromJson(updatedJson);

      // Keep user in sync with updated name/rank
      if (_user != null) {
        _user = UserModel(
          id: _user!.id,
          username: _user!.username,
          role: _user!.role,
          personnelId: _user!.personnelId,
          unitId: _user!.unitId,
          name: _profile?.name ?? _user!.name,
          rank: _profile?.rank ?? _user!.rank,
          unitName: _profile?.unitName ?? _user!.unitName,
          serviceNumber: _profile?.serviceNumber ?? _user!.serviceNumber,
        );

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('current_user_json', jsonEncode(_user!.toJson()));
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _apiService.clearToken();
    _user = null;
    _profile = null;
    _errorMessage = null;
    notifyListeners();
  }
}
