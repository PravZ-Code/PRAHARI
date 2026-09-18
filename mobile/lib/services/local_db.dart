import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart' as sql;

class LocalDb {
  static final LocalDb _instance = LocalDb._internal();
  factory LocalDb() => _instance;
  LocalDb._internal();

  sql.Database? _db;
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    if (!kIsWeb) {
      try {
        final databasesPath = await sql.getDatabasesPath();
        final path = p.join(databasesPath, 'prahari_soldier.db');

        _db = await sql.openDatabase(
          path,
          version: 1,
          onCreate: (db, version) async {
            await db.execute('''
              CREATE TABLE requests (
                client_id TEXT PRIMARY KEY,
                request_type TEXT,
                category TEXT,
                sub_category TEXT,
                description TEXT,
                start_date TEXT,
                end_date TEXT,
                status TEXT,
                is_fast_lane INTEGER,
                sla_hours_remaining REAL,
                sla_breached INTEGER,
                escalation_level INTEGER,
                escalation_reason TEXT,
                sync_status TEXT,
                server_id TEXT,
                created_at TEXT
              )
            ''');

            await db.execute('''
              CREATE TABLE checkins (
                client_id TEXT PRIMARY KEY,
                sleep_quality TEXT,
                workload_feel TEXT,
                welfare_note TEXT,
                sync_status TEXT,
                created_at TEXT
              )
            ''');

            await db.execute('''
              CREATE TABLE buddy_signals (
                client_id TEXT PRIMARY KEY,
                colleague_name TEXT,
                concern_type TEXT,
                note TEXT,
                sync_status TEXT,
                created_at TEXT
              )
            ''');

            await db.execute('''
              CREATE TABLE cached_profile (
                service_number TEXT PRIMARY KEY,
                name TEXT,
                rank TEXT,
                unit_name TEXT,
                status_label TEXT,
                rest_status TEXT,
                active_requests_count INTEGER,
                last_synced TEXT
              )
            ''');
          },
        );
      } catch (e) {
        debugPrint('[LocalDb] Native SQLite initialization fallback: $e');
      }
    }
    _initialized = true;
  }

  // --- Requests CRUD ---
  Future<void> insertRequest(Map<String, dynamic> req) async {
    await init();
    if (_db != null) {
      await _db!.insert(
        'requests',
        req,
        conflictAlgorithm: sql.ConflictAlgorithm.replace,
      );
    } else {
      final prefs = await SharedPreferences.getInstance();
      final list = await getAllRequests();
      list.removeWhere((r) => r['client_id'] == req['client_id']);
      list.insert(0, req);
      await prefs.setString('offline_requests', jsonEncode(list));
    }
  }

  Future<List<Map<String, dynamic>>> getAllRequests() async {
    await init();
    if (_db != null) {
      final rows = await _db!.query('requests', orderBy: 'created_at DESC');
      return List<Map<String, dynamic>>.from(rows);
    } else {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('offline_requests');
      if (raw == null || raw.isEmpty) return [];
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  Future<List<Map<String, dynamic>>> getPendingRequests() async {
    await init();
    if (_db != null) {
      final rows = await _db!.query(
        'requests',
        where: 'sync_status = ?',
        whereArgs: ['PENDING_SYNC'],
        orderBy: 'created_at ASC',
      );
      return List<Map<String, dynamic>>.from(rows);
    } else {
      final all = await getAllRequests();
      return all.where((r) => r['sync_status'] == 'PENDING_SYNC').toList();
    }
  }

  Future<void> markRequestSynced(String clientId, String serverId) async {
    await init();
    if (_db != null) {
      await _db!.update(
        'requests',
        {'sync_status': 'SYNCED', 'server_id': serverId},
        where: 'client_id = ?',
        whereArgs: [clientId],
      );
    } else {
      final all = await getAllRequests();
      for (final r in all) {
        if (r['client_id'] == clientId) {
          r['sync_status'] = 'SYNCED';
          r['server_id'] = serverId;
          break;
        }
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('offline_requests', jsonEncode(all));
    }
  }

  Future<void> updateRequestsFromServer(List<dynamic> serverItems) async {
    await init();
    final all = await getAllRequests();
    final localDrafts = all.where((r) => r['sync_status'] == 'PENDING_SYNC').toList();

    final merged = <Map<String, dynamic>>[...localDrafts];

    for (final item in serverItems) {
      if (item is Map) {
        final sId = item['id']?.toString() ?? '';
        // If already exists in drafts, don't overwrite user's uncommitted draft
        if (localDrafts.any((d) => d['client_id'] == sId)) continue;

        merged.add({
          'client_id': sId,
          'request_type': item['request_type'] ?? 'leave',
          'category': item['category'] ?? 'General',
          'sub_category': '',
          'description': item['description'] ?? '',
          'start_date': item['start_date'] ?? '',
          'end_date': item['end_date'] ?? '',
          'status': item['status'] ?? 'submitted',
          'is_fast_lane': item['is_fast_lane'] == true ? 1 : 0,
          'sla_hours_remaining': (item['hours_remaining'] as num?)?.toDouble() ?? 72.0,
          'sla_breached': item['sla_breached'] == true ? 1 : 0,
          'escalation_level': (item['escalation_level'] as num?)?.toInt() ?? 0,
          'escalation_reason': item['escalation_reason'] ?? '',
          'sync_status': 'SYNCED',
          'server_id': sId,
          'created_at': item['filed_at']?.toString() ?? DateTime.now().toIso8601String(),
        });
      }
    }

    if (_db != null) {
      await _db!.transaction((txn) async {
        await txn.delete('requests');
        for (final r in merged) {
          await txn.insert('requests', r, conflictAlgorithm: sql.ConflictAlgorithm.replace);
        }
      });
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('offline_requests', jsonEncode(merged));
    }
  }

  // --- Check-ins CRUD ---
  Future<void> insertCheckin(Map<String, dynamic> checkin) async {
    await init();
    if (_db != null) {
      await _db!.insert('checkins', checkin, conflictAlgorithm: sql.ConflictAlgorithm.replace);
    } else {
      final prefs = await SharedPreferences.getInstance();
      final list = await getPendingCheckins();
      list.add(checkin);
      await prefs.setString('offline_checkins', jsonEncode(list));
    }
  }

  Future<List<Map<String, dynamic>>> getPendingCheckins() async {
    await init();
    if (_db != null) {
      final rows = await _db!.query('checkins', where: 'sync_status = ?', whereArgs: ['PENDING_SYNC']);
      return List<Map<String, dynamic>>.from(rows);
    } else {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('offline_checkins');
      if (raw == null || raw.isEmpty) return [];
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  Future<void> markCheckinSynced(String clientId) async {
    await init();
    if (_db != null) {
      await _db!.delete('checkins', where: 'client_id = ?', whereArgs: [clientId]);
    } else {
      final all = await getPendingCheckins();
      all.removeWhere((c) => c['client_id'] == clientId);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('offline_checkins', jsonEncode(all));
    }
  }

  // --- Buddy Signals CRUD ---
  Future<void> insertBuddySignal(Map<String, dynamic> sig) async {
    await init();
    if (_db != null) {
      await _db!.insert('buddy_signals', sig, conflictAlgorithm: sql.ConflictAlgorithm.replace);
    } else {
      final prefs = await SharedPreferences.getInstance();
      final list = await getPendingBuddySignals();
      list.add(sig);
      await prefs.setString('offline_buddy_signals', jsonEncode(list));
    }
  }

  Future<List<Map<String, dynamic>>> getPendingBuddySignals() async {
    await init();
    if (_db != null) {
      final rows = await _db!.query('buddy_signals', where: 'sync_status = ?', whereArgs: ['PENDING_SYNC']);
      return List<Map<String, dynamic>>.from(rows);
    } else {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('offline_buddy_signals');
      if (raw == null || raw.isEmpty) return [];
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      } catch (_) {
        return [];
      }
    }
  }

  Future<void> markBuddySignalSynced(String clientId) async {
    await init();
    if (_db != null) {
      await _db!.delete('buddy_signals', where: 'client_id = ?', whereArgs: [clientId]);
    } else {
      final all = await getPendingBuddySignals();
      all.removeWhere((s) => s['client_id'] == clientId);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('offline_buddy_signals', jsonEncode(all));
    }
  }

  // --- Cached Safe Profile ---
  Future<void> cacheProfile(Map<String, dynamic> prof) async {
    await init();
    final cleanProf = {
      'service_number': prof['service_number'] ?? 'CRPF-98721',
      'name': prof['name'] ?? 'Trooper',
      'rank': prof['rank'] ?? 'Constable',
      'unit_name': prof['unit_name'] ?? 'Alpha Company',
      'status_label': prof['status_label'] ?? 'On track',
      'rest_status': prof['rest_status'] ?? 'Rest compliant',
      'active_requests_count': prof['active_requests_count'] ?? 0,
      'last_synced': prof['last_synced'] ?? DateTime.now().toIso8601String(),
    };

    if (_db != null) {
      await _db!.insert('cached_profile', cleanProf, conflictAlgorithm: sql.ConflictAlgorithm.replace);
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_profile', jsonEncode(cleanProf));
    }
  }

  Future<Map<String, dynamic>?> getCachedProfile() async {
    await init();
    if (_db != null) {
      final rows = await _db!.query('cached_profile', limit: 1);
      if (rows.isNotEmpty) return Map<String, dynamic>.from(rows.first);
    } else {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('cached_profile');
      if (raw != null && raw.isNotEmpty) {
        try {
          return Map<String, dynamic>.from(jsonDecode(raw));
        } catch (_) {}
      }
    }
    return null;
  }
}
