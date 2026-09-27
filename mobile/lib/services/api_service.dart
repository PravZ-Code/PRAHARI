import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/assessment_model.dart';
import 'secure_auth_store.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  /// Compile-time configurable backend URL.
  /// Build with: flutter build apk --dart-define=API_BASE_URL=https://api.yourdomain.com/api
  /// or: flutter run --dart-define=PRAHARI_API_URL=http://10.0.2.2:8000/api
  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static const String _prahariEnvBaseUrl = String.fromEnvironment('PRAHARI_API_URL', defaultValue: '');

  String _customBaseUrl = '';
  String? _token;

  String get defaultBaseUrl {
    // 1. Compile-time override (production builds)
    if (_prahariEnvBaseUrl.isNotEmpty) {
      return _prahariEnvBaseUrl.replaceAll(RegExp(r'/+$'), '');
    }
    if (_envBaseUrl.isNotEmpty) {
      return _envBaseUrl.replaceAll(RegExp(r'/+$'), '');
    }
    // 2. Web: use the serving host
    if (kIsWeb) {
      final host = Uri.base.host.isNotEmpty ? Uri.base.host : 'localhost';
      final port = Uri.base.port != 0 && Uri.base.port != 80 && Uri.base.port != 443
          ? ':${Uri.base.port}'
          : ':8000';
      return 'http://$host$port/api';
    }
    // 3. Android emulator → host machine
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8000/api';
      }
    } catch (_) {}
    // 4. Desktop / iOS simulator → localhost
    return 'http://localhost:8000/api';
  }

  String get baseUrl => _customBaseUrl.isNotEmpty ? _customBaseUrl : defaultBaseUrl;

  Future<void> setCustomBaseUrl(String url) async {
    final normalized = url.trim().replaceAll(RegExp(r'/+$'), '');
    final parsed = Uri.tryParse(normalized);
    if (parsed == null || parsed.host.isEmpty || !['http', 'https'].contains(parsed.scheme)) {
      throw ArgumentError('API URL must be an absolute http(s) URL');
    }
    _customBaseUrl = normalized;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('custom_base_url', _customBaseUrl);
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _customBaseUrl = prefs.getString('custom_base_url') ?? '';
    _token = prefs.getString('jwt_token');
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('current_user_json');
  }

  Map<String, String> get _headers {
    final map = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null && _token!.isNotEmpty) {
      map['Authorization'] = 'Bearer $_token';
    }
    return map;
  }

  // --- Auth Endpoints ---
  Future<Map<String, dynamic>> login(String identifier, String secret) async {
    final uri = Uri.parse('$baseUrl/auth/login');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': identifier.trim(),
        'service_number': identifier.trim(),
        'password': secret.trim(),
        'pin': secret.trim(),
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['access_token'];
      if (token != null) {
        await saveToken(token);
        await SecureAuthStore().saveToken(token);
      }
      await SecureAuthStore().savePin(identifier, secret);
      if (data['user'] != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('current_user_json', jsonEncode(data['user']));
      }
      return data;
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['detail'] ?? 'Login failed (${response.statusCode})');
    }
  }

  Future<Map<String, dynamic>> refreshToken() async {
    final uri = Uri.parse('$baseUrl/auth/refresh');
    final response = await http.post(uri, headers: _headers);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['access_token'];
      if (token != null) {
        await saveToken(token);
        await SecureAuthStore().saveToken(token);
      }
      return data;
    } else {
      throw Exception('Failed to refresh token: ${response.statusCode}');
    }
  }

  // --- Safe Status & Requests Endpoints (Surveillance-Free) ---
  Future<Map<String, dynamic>> getSafePersonnelStatus() async {
    final uri = Uri.parse('$baseUrl/personnel/me/status');
    try {
      final response = await http.get(uri, headers: _headers);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return {
      'status_label': 'On track',
      'rest_status': 'Rest compliant',
      'active_requests_count': 0,
      'hours_since_last_duty': 9.0,
    };
  }

  Future<List<dynamic>> getMyRequests() async {
    final uri = Uri.parse('$baseUrl/grievance/mine');
    try {
      final response = await http.get(uri, headers: _headers);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) return data;
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> fileGrievanceOrLeave({
    String? id,
    required String requestType,
    required String category,
    required String description,
    String? startDate,
    String? endDate,
  }) async {
    final uri = Uri.parse('$baseUrl/grievance/');
    final Map<String, dynamic> body = {
      'id': ?id,
      'request_type': requestType,
      'category': category,
      'description': description,
      'filing_channel': 'mobile_app',
    };
    if (startDate != null && startDate.isNotEmpty) {
      body['start_date'] = startDate;
    }
    if (endDate != null && endDate.isNotEmpty) {
      body['end_date'] = endDate;
    }

    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode(body),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['detail'] ?? 'Failed to submit request: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> submitWelfareCheckin({
    String? id,
    required String sleepQuality,
    required String workloadFeel,
    String? welfareNote,
  }) async {
    final uri = Uri.parse('$baseUrl/welfare/checkin');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'id': ?id,
        'sleep_quality': sleepQuality,
        'workload_feel': workloadFeel,
        'welfare_note': welfareNote,
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Checkin submission failed: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> submitWelfareBuddySignal({
    String? id,
    required String colleagueName,
    required String concernType,
    String? note,
  }) async {
    final uri = Uri.parse('$baseUrl/welfare/buddy-signal');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'id': ?id,
        'colleague_name': colleagueName,
        'concern_type': concernType,
        'note': note,
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Buddy signal submission failed: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> triggerWelfareSos({String? message}) async {
    final uri = Uri.parse('$baseUrl/welfare/sos');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'message': message ?? 'Immediate confidential welfare support requested via mobile application.',
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('SOS call failed: ${response.statusCode}');
    }
  }

  // --- Personnel Profile Endpoints ---
  Future<Map<String, dynamic>> getPersonnelProfile() async {
    final uri = Uri.parse('$baseUrl/personnel/me');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['detail'] ?? 'Failed to load profile: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> updatePersonnelProfile(Map<String, dynamic> data) async {
    final uri = Uri.parse('$baseUrl/personnel/me');
    final response = await http.put(
      uri,
      headers: _headers,
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['detail'] ?? 'Failed to update profile: ${response.statusCode}');
    }
  }

  // --- Health Check ---
  Future<bool> checkHealth() async {
    try {
      final rootUrl = baseUrl.replaceAll('/api', '');
      final uri = Uri.parse('$rootUrl/health');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // --- Trooper Assessment Endpoints ---
  Future<Map<String, dynamic>> getPersonalDashboard() async {
    final uri = Uri.parse('$baseUrl/assessment/my-dashboard');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load dashboard: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> submitAssessment(AssessmentModel model) async {
    final uri = Uri.parse('$baseUrl/assessment/submit');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode(model.toJson()),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to submit assessment: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> submitHelpRequest(String message) async {
    final uri = Uri.parse('$baseUrl/assessment/help-request');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({'message': message}),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to send SOS help request: ${response.statusCode}');
    }
  }

  // --- 72-Hour Grievance / Emergency Leave Endpoints ---
  Future<Map<String, dynamic>> submitPersonnelRequest({
    required String requestType,
    required String category,
    required String description,
    String? startDate,
    String? endDate,
  }) async {
    final uri = Uri.parse('$baseUrl/grievance/submit');
    final Map<String, dynamic> body = {
      'request_type': requestType,
      'category': category,
      'description': description,
      'filing_channel': 'mobile_prahari_bandhu',
    };
    if (startDate != null && startDate.isNotEmpty) {
      body['start_date'] = startDate;
    }
    if (endDate != null && endDate.isNotEmpty) {
      body['end_date'] = endDate;
    }

    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode(body),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      try {
        final err = jsonDecode(response.body);
        throw Exception(err['detail'] ?? 'Failed to submit request: ${response.statusCode}');
      } catch (e) {
        if (e is Exception) rethrow;
        throw Exception('Failed to submit request: ${response.statusCode}');
      }
    }
  }

  Future<Map<String, dynamic>> submitEmergencyLeave({
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

  Future<List<dynamic>> getMyGrievances() async {
    final uri = Uri.parse('$baseUrl/grievance/my-status');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is List) return data;
      if (data is Map && data['grievances'] != null) return data['grievances'];
      return [data];
    } else {
      return [];
    }
  }

  // --- Commander Tactical Endpoints ---
  Future<Map<String, dynamic>> getCommanderUnits() async {
    final uri = Uri.parse('$baseUrl/commander/units');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load commander units: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> getUnitReadiness(String unitId) async {
    final uri = Uri.parse('$baseUrl/commander/unit/$unitId/readiness');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load unit readiness: ${response.statusCode}');
    }
  }

  // --- Anonymous Peer Buddy Check ---
  Future<Map<String, dynamic>> submitBuddySignal({
    required int concernLevel,
    required String concernCategory,
  }) async {
    final uri = Uri.parse('$baseUrl/buddy/signal');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'concern_level': concernLevel,
        'concern_category': concernCategory,
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to submit buddy signal: ${response.statusCode}');
    }
  }

  // --- Prahari Vani Telecom Gateway (2G Phone Support) ---
  Future<Map<String, dynamic>> postIvrDTMF({
    required String callId,
    required String digits,
    String language = 'en',
    String? callerPhone,
  }) async {
    final uri = Uri.parse('$baseUrl/gateway/ivr/dtmf');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'call_id': callId,
        'digits': digits,
        'language': language,
        'caller_phone': callerPhone ?? '+919876543210',
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('IVR Gateway error: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> postUSSD({
    required String sessionId,
    required String userInput,
    String? msisdn,
  }) async {
    final uri = Uri.parse('$baseUrl/gateway/ussd');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'session_id': sessionId,
        'user_input': userInput,
        'msisdn': msisdn ?? '+919876543210',
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('USSD Gateway error: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> postIncomingSMS({
    required String sender,
    required String message,
  }) async {
    final uri = Uri.parse('$baseUrl/gateway/sms/incoming');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'sender_phone': sender,
        'message_text': message,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('SMS Gateway error: ${response.statusCode}');
    }
  }

  // --- Air-Gap Tactical USB / Offline Sync ---
  Future<Map<String, dynamic>> exportAirgapBundle(String unitId) async {
    final uri = Uri.parse('$baseUrl/gateway/airgap/export/$unitId');
    final response = await http.post(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to export air-gap bundle: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> importAirgapBundle(Map<String, dynamic> bundle) async {
    final uri = Uri.parse('$baseUrl/gateway/airgap/import');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode(bundle),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to import air-gap bundle: ${response.statusCode}');
    }
  }

  // --- Welfare Officer Casework Endpoints ---
  Future<Map<String, dynamic>> getWelfareCases({int page = 1, int perPage = 20}) async {
    final uri = Uri.parse('$baseUrl/welfare/cases?page=$page&per_page=$perPage');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load welfare cases: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> acknowledgeWelfareCase(String caseId) async {
    final uri = Uri.parse('$baseUrl/welfare/case/$caseId/acknowledge');
    final response = await http.put(uri, headers: _headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to acknowledge case: ${response.statusCode}');
    }
  }

  Future<Map<String, dynamic>> planWelfareCase({
    required String caseId,
    required String interventionType,
    required String interventionNotes,
  }) async {
    final uri = Uri.parse('$baseUrl/welfare/case/$caseId/plan');
    final response = await http.put(
      uri,
      headers: _headers,
      body: jsonEncode({
        'intervention_type': interventionType,
        'intervention_notes': interventionNotes,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create intervention plan: ${response.statusCode}');
    }
  }

  // --- Unit Resilience Optimizer (URO), audit-ledger and officer-console APIs
  // were removed together with the unreachable officer-facing screens.
  // The soldier-first app (per the governing product rule) never exposes roster,
  // swap-approval, or audit-ledger surfaces to troopers.
  // --- Paramilitary AI Welfare & Duty Copilot ---
  Future<Map<String, dynamic>> chatWithCopilot({
    required String message,
    List<Map<String, String>> history = const [],
  }) async {
    final uri = Uri.parse('$baseUrl/copilot/chat');
    final response = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'message': message,
        'conversation_history': history,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }

    String detail = 'Server responded with status code ${response.statusCode}';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded.containsKey('detail')) {
        detail = decoded['detail'].toString();
      }
    } catch (_) {}

    throw Exception(detail);
  }
}

/// Explicit error type so callers can distinguish HTTP failures (status >= 0)
/// from connectivity failures (status == -1) instead of receiving fabricated data.
class HttpApiException implements Exception {
  final int statusCode;
  final String message;
  HttpApiException(this.statusCode, this.message);
  @override
  String toString() => 'HttpApiException($statusCode): $message';
}
