import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'api_service.dart';
import 'local_db.dart';

enum SyncState { synced, syncing, pending, offline }

class SyncQueue with ChangeNotifier {
  static final SyncQueue _instance = SyncQueue._internal();
  factory SyncQueue() => _instance;
  SyncQueue._internal();

  final LocalDb _db = LocalDb();
  final ApiService _api = ApiService();
  final Uuid _uuid = const Uuid();

  SyncState _state = SyncState.synced;
  int _pendingCount = 0;
  String _statusMessage = 'Up to date';
  DateTime? _lastSyncTime;

  StreamSubscription<List<ConnectivityResult>>? _connSub;
  bool _isFlushing = false;

  SyncState get state => _state;
  int get pendingCount => _pendingCount;
  String get statusMessage => _statusMessage;
  DateTime? get lastSyncTime => _lastSyncTime;
  bool get isOffline => _state == SyncState.offline;

  Future<void> init() async {
    await _db.init();
    await _updatePendingCount();

    // Listen to network changes
    _connSub = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) {
        if (_state == SyncState.offline) {
          _state = SyncState.syncing;
          notifyListeners();
        }
        flushQueue();
      } else {
        _state = SyncState.offline;
        _statusMessage = 'Offline — saving on device';
        notifyListeners();
      }
    });

    // Check initial connectivity
    try {
      final res = await Connectivity().checkConnectivity();
      final isOnline = res.any((r) => r != ConnectivityResult.none);
      if (!isOnline) {
        _state = SyncState.offline;
        _statusMessage = 'Offline — saving on device';
      }
    } catch (_) {}
  }

  void disposeSubscription() {
    _connSub?.cancel();
  }

  Future<void> _updatePendingCount() async {
    final reqs = await _db.getPendingRequests();
    final chks = await _db.getPendingCheckins();
    final sigs = await _db.getPendingBuddySignals();
    _pendingCount = reqs.length + chks.length + sigs.length;

    if (_pendingCount > 0) {
      if (_state != SyncState.syncing) {
        _state = SyncState.pending;
        _statusMessage = 'Saved on phone — will send when network returns';
      }
    } else {
      if (_state != SyncState.offline && _state != SyncState.syncing) {
        _state = SyncState.synced;
        _statusMessage = 'All requests synchronized';
      }
    }
    notifyListeners();
  }

  // --- Submissions ---

  Future<String> submitRequestLocally({
    required String requestType,
    required String category,
    required String description,
    String? startDate,
    String? endDate,
    bool isFastLane = false,
  }) async {
    final clientId = _uuid.v4();
    final now = DateTime.now().toIso8601String();

    final req = {
      'client_id': clientId,
      'request_type': requestType,
      'category': category,
      'sub_category': '',
      'description': description,
      'start_date': startDate ?? '',
      'end_date': endDate ?? '',
      'status': isFastLane ? 'fast_tracked' : 'submitted',
      'is_fast_lane': isFastLane ? 1 : 0,
      'sla_hours_remaining': isFastLane ? 12.0 : 72.0,
      'sla_breached': 0,
      'escalation_level': 0,
      'escalation_reason': '',
      'sync_status': 'PENDING_SYNC',
      'server_id': '',
      'created_at': now,
    };

    await _db.insertRequest(req);
    await _updatePendingCount();

    // Fire non-blocking background flush
    flushQueue();

    return clientId;
  }

  Future<String> submitCheckinLocally({
    required String sleepQuality,
    required String workloadFeel,
    String? welfareNote,
  }) async {
    final clientId = _uuid.v4();
    final now = DateTime.now().toIso8601String();

    final chk = {
      'client_id': clientId,
      'sleep_quality': sleepQuality,
      'workload_feel': workloadFeel,
      'welfare_note': welfareNote ?? '',
      'sync_status': 'PENDING_SYNC',
      'created_at': now,
    };

    await _db.insertCheckin(chk);
    await _updatePendingCount();

    flushQueue();
    return clientId;
  }

  Future<String> submitBuddySignalLocally({
    required String colleagueName,
    required String concernType,
    String? note,
  }) async {
    final clientId = _uuid.v4();
    final now = DateTime.now().toIso8601String();

    final sig = {
      'client_id': clientId,
      'colleague_name': colleagueName,
      'concern_type': concernType,
      'note': note ?? '',
      'sync_status': 'PENDING_SYNC',
      'created_at': now,
    };

    await _db.insertBuddySignal(sig);
    await _updatePendingCount();

    flushQueue();
    return clientId;
  }

  // --- Queue Flushing & Network Synchronization ---

  Future<void> flushQueue() async {
    if (_isFlushing) return;
    _isFlushing = true;

    try {
      final conn = await Connectivity().checkConnectivity();
      if (!conn.any((r) => r != ConnectivityResult.none)) {
        _state = SyncState.offline;
        _statusMessage = 'Offline — saving on device';
        notifyListeners();
        return;
      }

      _state = SyncState.syncing;
      _statusMessage = 'Sending requests to server…';
      notifyListeners();

      // 1. Flush pending requests (FIFO)
      final pendingReqs = await _db.getPendingRequests();
      for (final r in pendingReqs) {
        try {
          final res = await _api.fileGrievanceOrLeave(
            id: r['client_id'],
            requestType: r['request_type'] ?? 'leave',
            category: r['category'] ?? 'family_emergency',
            description: r['description'] ?? '',
            startDate: r['start_date']?.toString().isNotEmpty == true ? r['start_date'] : null,
            endDate: r['end_date']?.toString().isNotEmpty == true ? r['end_date'] : null,
          );
          final serverId = res['id']?.toString() ?? r['client_id'];
          await _db.markRequestSynced(r['client_id'], serverId);
        } catch (e) {
          debugPrint('[SyncQueue] Request sync retry error: $e');
        }
      }

      // 2. Flush pending check-ins
      final pendingCheckins = await _db.getPendingCheckins();
      for (final c in pendingCheckins) {
        try {
          await _api.submitWelfareCheckin(
            id: c['client_id'],
            sleepQuality: c['sleep_quality'],
            workloadFeel: c['workload_feel'],
            welfareNote: c['welfare_note'],
          );
          await _db.markCheckinSynced(c['client_id']);
        } catch (e) {
          debugPrint('[SyncQueue] Checkin sync retry error: $e');
        }
      }

      // 3. Flush pending buddy signals
      final pendingSignals = await _db.getPendingBuddySignals();
      for (final s in pendingSignals) {
        try {
          await _api.submitWelfareBuddySignal(
            id: s['client_id'],
            colleagueName: s['colleague_name'],
            concernType: s['concern_type'],
            note: s['note'],
          );
          await _db.markBuddySignalSynced(s['client_id']);
        } catch (e) {
          debugPrint('[SyncQueue] Buddy signal sync retry error: $e');
        }
      }

      // 4. Pull down latest status
      await syncDown();

      _lastSyncTime = DateTime.now();
      _state = SyncState.synced;
      _statusMessage = 'All requests synchronized';
    } catch (e) {
      debugPrint('[SyncQueue] Flush error: $e');
      _state = SyncState.pending;
      _statusMessage = 'Saved on phone — will retry';
    } finally {
      _isFlushing = false;
      await _updatePendingCount();
    }
  }

  Future<void> syncDown() async {
    try {
      // 1. Fetch user requests with SLA countdowns
      final serverReqs = await _api.getMyRequests();
      await _db.updateRequestsFromServer(serverReqs);

      // 2. Fetch safe status (never raw risk scores)
      final safeStatus = await _api.getSafePersonnelStatus();
      await _db.cacheProfile(safeStatus);
    } catch (e) {
      debugPrint('[SyncQueue] SyncDown error: $e');
    }
  }
}
