import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:prahari_mobile/services/secure_auth_store.dart';
import 'package:prahari_mobile/models/grievance_model.dart';
import 'package:prahari_mobile/widgets/sos_dialog.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Soldier-First Offline Authentication & Security Store Tests', () {
    final Map<String, String> mockSecureStorage = {};

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      mockSecureStorage.clear();

      const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (MethodCall methodCall) async {
        final args = methodCall.arguments as Map?;
        if (methodCall.method == 'write') {
          if (args != null && args['key'] != null) {
            mockSecureStorage[args['key'] as String] = args['value'] as String;
          }
          return null;
        } else if (methodCall.method == 'read') {
          if (args != null && args['key'] != null) {
            return mockSecureStorage[args['key'] as String];
          }
          return null;
        } else if (methodCall.method == 'delete') {
          if (args != null && args['key'] != null) {
            mockSecureStorage.remove(args['key'] as String);
          }
          return null;
        } else if (methodCall.method == 'deleteAll') {
          mockSecureStorage.clear();
          return null;
        }
        return null;
      });
    });

    test('SecureAuthStore correctly hashes PIN and validates match', () async {
      final store = SecureAuthStore();
      const serviceNo = 'CRPF-TEST-8899';
      const correctPin = '1234';
      const wrongPin = '9999';

      await store.savePin(serviceNo, correctPin);

      final hasPin = await store.hasPin(serviceNo);
      expect(hasPin, isTrue);

      final verified = await store.verifyPin(serviceNo, correctPin);
      expect(verified, isTrue);

      final failed = await store.verifyPin(serviceNo, wrongPin);
      expect(failed, isFalse);

      final lastNo = await store.getLastServiceNumber();
      expect(lastNo, serviceNo);
    });

    test('SecureAuthStore token management saves and clears correctly', () async {
      final store = SecureAuthStore();
      const sampleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.payload';

      await store.saveToken(sampleJwt);
      final retrieved = await store.getToken();
      expect(retrieved, sampleJwt);

      await store.clearAuth();
      final afterClear = await store.getToken();
      expect(afterClear, isNull);
    });
  });

  group('Soldier SLA Countdown & Grievance Model Tests', () {
    test('GrievanceModel calculates SLA breach and hours remaining accurately', () {
      final json = {
        'id': 'uuid-req-999',
        'personnel_id': 'p-505',
        'request_type': 'leave',
        'category': 'family_emergency',
        'description': 'Family medical support needed',
        'sla_deadline_hours': 72,
        'hours_remaining': 14.5,
        'sla_breached': false,
        'escalation_level': 0,
        'status': 'under_review',
        'filed_at': '2026-09-17T10:00:00Z',
      };

      final req = GrievanceModel.fromJson(json);
      expect(req.id, 'uuid-req-999');
      expect(req.hoursRemaining, 14.5);
      expect(req.slaBreached, isFalse);
      expect(req.escalationLevel, 0);

      // Now test SLA breached scenario
      final breachedJson = Map<String, dynamic>.from(json);
      breachedJson['hours_remaining'] = 0.0;
      breachedJson['sla_breached'] = true;
      breachedJson['escalation_level'] = 1;

      final breachedReq = GrievanceModel.fromJson(breachedJson);
      expect(breachedReq.slaBreached, isTrue);
      expect(breachedReq.escalationLevel, 1);
      expect(breachedReq.hoursRemaining, 0.0);
    });
  });

  group('Emergency SOS Dialog & Safety Net Widget Tests', () {
    testWidgets('SosDialog displays 14416 Emergency Helpline and Welfare Officer buttons', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (ctx) => ElevatedButton(
                onPressed: () => SosDialog.show(ctx),
                child: const Text('TRIGGER'),
              ),
            ),
          ),
        ),
      );

      // Open bottom sheet
      await tester.tap(find.text('TRIGGER'));
      await tester.pumpAndSettle();

      // Verify Tele-MANAS and Welfare Officer prompts
      expect(find.text('Help & Immediate Contact'), findsOneWidget);
      expect(find.text('Call Emergency Helpline (14416)'), findsOneWidget);
      expect(find.text('Talk to Welfare Officer Now'), findsOneWidget);
      expect(find.text('Bypasses all queues. Zero forms. 100% confidential under Section 21 MHCA 2017.'), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);
    });
  });
}
