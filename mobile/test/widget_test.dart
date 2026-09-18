import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prahari_mobile/models/stress_prediction.dart';
import 'package:prahari_mobile/models/user_model.dart';
import 'package:prahari_mobile/models/grievance_model.dart';
import 'package:prahari_mobile/models/assessment_model.dart';
import 'package:prahari_mobile/providers/dashboard_provider.dart';
import 'package:prahari_mobile/services/stress_engine.dart';
import 'package:prahari_mobile/widgets/stress_gauge.dart';

void main() {
  group('PRAHARI Stress Engine Tests', () {
    test('Optimal conditions yield LOW RISK (<35%)', () {
      final res = StressEngine.predict(
        consecutiveNightShifts: 0,
        sleepHours: 8.0,
        perceivedStress: 1,
        energyLevel: 5,
        moodScore: 5,
        daysWithoutOff: 2,
        deploymentZone: 'peace',
      );
      expect(res.category, RiskCategory.low);
      expect(res.percentage, lessThanOrEqualTo(35));
      expect(res.isRisky, isFalse);
    });

    test('Multiple night shifts and sleep deprivation yield HIGH / CRITICAL RISK', () {
      final res = StressEngine.predict(
        consecutiveNightShifts: 4,
        sleepHours: 3.5,
        perceivedStress: 5,
        energyLevel: 1,
        moodScore: 2,
        daysWithoutOff: 18,
        deploymentZone: 'hard_jungle',
      );
      expect(res.percentage, greaterThan(65));
      expect(res.isRisky, isTrue);
      expect(res.factors.isNotEmpty, isTrue);
    });
  });

  group('Multi-User & Personnel Models Tests', () {
    test('UserModel role validation strictly isolates personnel', () {
      final trooper = UserModel(
        id: 'u-1',
        username: 'rajesh_kumar',
        role: 'personnel',
        name: 'Rajesh Kumar',
        rank: 'Constable',
      );
      expect(trooper.isPersonnel, isTrue);
      expect(trooper.isCommander, isFalse);
      expect(trooper.isWelfare, isFalse);

      final commander = UserModel(
        id: 'u-2',
        username: 'cmd_vikram',
        role: 'commander',
      );
      expect(commander.isPersonnel, isFalse);
      expect(commander.isCommander, isTrue);
    });

    test('PersonnelProfile serializes and deserializes correctly', () {
      final json = {
        'id': 'p-101',
        'service_number': 'CRPF-ALPHA-001',
        'name': 'Rajesh Kumar',
        'rank': 'Constable',
        'trade': 'GD',
        'company': 'Alpha Company',
        'contact_number': '9876543210',
        'unit_id': 'u-alpha',
        'unit_name': 'Alpha Srinagar FOB',
        'formation': '4th Battalion',
        'operational_area': 'hard',
        'date_of_joining': '2019-04-15',
        'current_posting_date': '2024-07-26',
        'hard_area_months': 28,
        'total_transfers': 4,
      };

      final profile = PersonnelProfile.fromJson(json);
      expect(profile.name, 'Rajesh Kumar');
      expect(profile.company, 'Alpha Company');
      expect(profile.contactNumber, '9876543210');
      expect(profile.hardAreaMonths, 28);

      final updated = profile.copyWith(contactNumber: '9999988888', company: 'Bravo Squad');
      expect(updated.contactNumber, '9999988888');
      expect(updated.company, 'Bravo Squad');
      expect(updated.name, 'Rajesh Kumar');
    });

    test('GrievanceModel parses approvals, fast-lane flags, and resolution notes', () {
      final json = {
        'id': 'g-202',
        'personnel_id': 'p-101',
        'request_type': 'leave',
        'category': 'family_emergency',
        'description': 'Father admitted to ICU',
        'is_fast_lane': true,
        'status': 'under_review',
        'sla_deadline_hours': 72,
        'hours_remaining': 48.5,
        'commander_approved': false,
        'welfare_approved': true,
      };

      final g = GrievanceModel.fromJson(json);
      expect(g.isFastLane, isTrue);
      expect(g.status, 'under_review');
      expect(g.hoursRemaining, 48.5);
      expect(g.welfareApproved, isTrue);
      expect(g.commanderApproved, isFalse);
    });

    test('UserModel and GrievanceModel handle integer IDs and non-standard timestamps safely', () {
      final userJson = {
        'id': 101, // Integer ID from SQL
        'username': 'rajesh_kumar',
        'role': 'personnel',
        'personnel_id': 4552,
        'unit_id': 99,
      };
      final user = UserModel.fromJson(userJson);
      expect(user.id, '101');
      expect(user.personnelId, '4552');
      expect(user.unitId, '99');

      final grievanceJson = {
        'id': 2024,
        'personnel_id': 4552,
        'request_type': 'emergency_leave',
        'category': 'medical',
        'filed_at': '2026-09-17 14:30:00', // Non-standard format without T
        'sla_deadline': '2026-09-20 14:30:00',
        'sla_deadline_hours': 72,
        'is_fast_lane': true,
        'status': 'pending',
        'hours_remaining': 71.5,
        'escalation_level': 0,
      };
      final g = GrievanceModel.fromJson(grievanceJson);
      expect(g.id, '2024');
      expect(g.personnelId, '4552');
      expect(g.filedAt.year, 2026);
    });

    test('AssessmentModel serializes and parses correctly with safe num casting', () {
      final json = {
        'id': 789,
        'sleep_quality': 4,
        'sleep_hours': 7.5,
        'mood_score': 4,
        'energy_level': 3,
        'stress_level': 2,
        'appetite_score': 4,
        'social_connection': 5,
        'free_text': 'Mandatory rest completed',
        'is_offline_entry': false,
        'assessed_at': '2026-09-17T10:00:00.000Z',
      };
      final assessment = AssessmentModel.fromJson(json);
      expect(assessment.id, '789');
      expect(assessment.sleepHours, 7.5);
      expect(assessment.sleepQuality, 4);
      expect(assessment.socialConnection, 5);
      expect(assessment.freeText, 'Mandatory rest completed');

      final serialized = assessment.toJson();
      expect(serialized['sleep_hours'], 7.5);
      expect(serialized['sleep_quality'], 4);
      expect(serialized['social_connection'], 5);
    });

    test('RiskCategory backgroundColor uses valid withValues alpha', () {
      expect(RiskCategory.low.backgroundColor.a, closeTo(0.3, 0.05));
      expect(RiskCategory.critical.backgroundColor.a, closeTo(0.3, 0.05));
    });

    test('DashboardProvider resetState wipes data on logout', () {
      final provider = DashboardProvider();
      provider.resetState();
      expect(provider.personnelId, isEmpty);
      expect(provider.activeGrievances, isEmpty);
      expect(provider.riskTrend, isEmpty);
      expect(provider.assessmentsSubmitted, 0);
    });
  });

  testWidgets('StressGauge renders percentage and category label', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StressGauge(
            percentage: 78,
            category: RiskCategory.high,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('78%'), findsOneWidget);
    expect(find.text('HIGH RISK'), findsOneWidget);
    expect(find.text('STRESS INDEX'), findsOneWidget);
  });
}
