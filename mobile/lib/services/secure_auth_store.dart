import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureAuthStore {
  static final SecureAuthStore _instance = SecureAuthStore._internal();
  factory SecureAuthStore() => _instance;
  SecureAuthStore._internal();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  String _hashPin(String pin) {
    final bytes = utf8.encode('prahari_salt_$pin');
    return sha256.convert(bytes).toString();
  }

  Future<void> savePin(String serviceNumber, String pin) async {
    final hashed = _hashPin(pin);
    final key = 'soldier_pin_${serviceNumber.trim().toUpperCase()}';
    if (!kIsWeb) {
      await _secureStorage.write(key: key, value: hashed);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, hashed);
    await prefs.setString('last_service_number', serviceNumber.trim().toUpperCase());
  }

  Future<bool> hasPin(String serviceNumber) async {
    final key = 'soldier_pin_${serviceNumber.trim().toUpperCase()}';
    if (!kIsWeb) {
      final stored = await _secureStorage.read(key: key);
      if (stored != null && stored.isNotEmpty) return true;
    }
    final prefs = await SharedPreferences.getInstance();
    final fallback = prefs.getString(key);
    return fallback != null && fallback.isNotEmpty;
  }

  Future<bool> verifyPin(String serviceNumber, String pin) async {
    final key = 'soldier_pin_${serviceNumber.trim().toUpperCase()}';
    final targetHash = _hashPin(pin);
    String? storedHash;

    if (!kIsWeb) {
      storedHash = await _secureStorage.read(key: key);
    }
    if (storedHash == null || storedHash.isEmpty) {
      final prefs = await SharedPreferences.getInstance();
      storedHash = prefs.getString(key);
    }

    return storedHash != null && storedHash == targetHash;
  }

  Future<void> saveToken(String token) async {
    if (!kIsWeb) {
      await _secureStorage.write(key: 'jwt_token', value: token);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_token', token);
  }

  Future<String?> getToken() async {
    if (!kIsWeb) {
      final token = await _secureStorage.read(key: 'jwt_token');
      if (token != null && token.isNotEmpty) return token;
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  Future<String?> getLastServiceNumber() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('last_service_number');
  }

  Future<void> clearAuth() async {
    if (!kIsWeb) {
      await _secureStorage.delete(key: 'jwt_token');
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('current_user_json');
  }
}
