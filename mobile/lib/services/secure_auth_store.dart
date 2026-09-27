import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureAuthStore {
  static final SecureAuthStore _instance = SecureAuthStore._internal();
  factory SecureAuthStore() => _instance;
  SecureAuthStore._internal();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  /// PBKDF2-style iterated SHA-256 with a per-user random salt.
  /// A static salt would allow instant brute-force of a 4-6 digit PIN if the
  /// storage file is ever exfiltrated; per-user salts + 10k rounds make each
  /// guess require a fresh 10k-hash computation, specific to one soldier.
  static const int _pinIterations = 10000;

  String _randomSaltHex() {
    final rng = Random.secure();
    final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  String _hashPinV2(String pin, String saltHex) {
    Digest digest = sha256.convert(utf8.encode('$saltHex:$pin'));
    for (var i = 1; i < _pinIterations; i++) {
      digest = sha256.convert(digest.bytes);
    }
    return digest.toString();
  }

  /// Legacy single-shot SHA-256 with a static salt (pre-hardening builds).
  String _hashPinLegacy(String pin) {
    final bytes = utf8.encode('prahari_salt_$pin');
    return sha256.convert(bytes).toString();
  }

  Future<void> savePin(String serviceNumber, String pin) async {
    final salt = _randomSaltHex();
    final stored = 'v2\$$salt\$${_hashPinV2(pin, salt)}';
    final key = 'soldier_pin_${serviceNumber.trim().toUpperCase()}';
    if (!kIsWeb) {
      // Secure enclave is best-effort: platforms without the plugin
      // (tests, some desktops) fall back to SharedPreferences below.
      try {
        await _secureStorage.write(key: key, value: stored);
      } catch (_) {}
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, stored);
    await prefs.setString('last_service_number', serviceNumber.trim().toUpperCase());
  }

  Future<bool> hasPin(String serviceNumber) async {
    final key = 'soldier_pin_${serviceNumber.trim().toUpperCase()}';
    if (!kIsWeb) {
      try {
        final stored = await _secureStorage.read(key: key);
        if (stored != null && stored.isNotEmpty) return true;
      } catch (_) {}
    }
    final prefs = await SharedPreferences.getInstance();
    final fallback = prefs.getString(key);
    return fallback != null && fallback.isNotEmpty;
  }

  Future<bool> verifyPin(String serviceNumber, String pin) async {
    final key = 'soldier_pin_${serviceNumber.trim().toUpperCase()}';
    String? storedHash;

    if (!kIsWeb) {
      try {
        storedHash = await _secureStorage.read(key: key);
      } catch (_) {}
    }
    if (storedHash == null || storedHash.isEmpty) {
      final prefs = await SharedPreferences.getInstance();
      storedHash = prefs.getString(key);
    }
    if (storedHash == null || storedHash.isEmpty) return false;

    if (storedHash.startsWith('v2\$')) {
      final parts = storedHash.split('\$');
      if (parts.length != 3) return false;
      return _hashPinV2(pin, parts[1]) == parts[2];
    }
    // Legacy unsalted-per-user format: verify, then transparently upgrade.
    if (storedHash == _hashPinLegacy(pin)) {
      await savePin(serviceNumber, pin);
      return true;
    }
    return false;
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
