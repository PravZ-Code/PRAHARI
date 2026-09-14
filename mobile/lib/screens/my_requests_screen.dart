import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dashboard_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../models/grievance_model.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';
import 'request_help_screen.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadGrievances();
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dash = context.watch<DashboardProvider>();
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;
    final requests = dash.activeGrievances;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'APPLICATION & LEAVE TRACKER',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'Statutory Resolution SLA & Lifecycle Audit',
              style: TextStyle(fontSize: 10.5, color: Color(0xFFCBD5E1)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20.0),
            tooltip: 'Refresh Status',
            onPressed: () => dash.loadGrievances(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => dash.loadGrievances(),
        child: requests.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.assignment_outlined, size: 48.0, color: Ux4gDefenseTheme.mhaNavy),
                      ),
                      const SizedBox(height: 16.0),
                      const Text(
                        'No Active Applications',
                        style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6.0),
                      Text(
                        'All submitted leave petitions, welfare requests, and grievances will appear here with real-time countdown SLAs.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                        ),
                      ),
                      const SizedBox(height: 20.0),
                      Ux4gButton(
                        label: 'Submit New Request',
                        icon: Icons.add,
                        isFullWidth: false,
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const RequestHelpScreen()),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                itemCount: requests.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12.0),
                itemBuilder: (ctx, idx) => _RequestCard(request: requests[idx]),
              ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final GrievanceModel request;

  const _RequestCard({required this.request});

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    final isEmergency = request.isFastLane;
    final isResolved = request.status.toLowerCase() == 'resolved';
    final remainingSeconds = (request.hoursRemaining * 3600).toInt();

    String slaCountdownText;
    if (isResolved) {
      slaCountdownText = 'RESOLVED WITHIN SLA';
    } else if (remainingSeconds <= 0) {
      slaCountdownText = 'AUTO-ESCALATED TO BATTALION 2IC';
    } else {
      final hours = remainingSeconds ~/ 3600;
      final minutes = (remainingSeconds % 3600) ~/ 60;
      final seconds = remainingSeconds % 60;
      slaCountdownText = '${hours}h ${minutes}m ${seconds}s remaining';
    }

    final createdAtStr = DateFormat('dd MMM yyyy, HH:mm').format(request.filedAt);

    return Ux4gCard(
      accentColor: isResolved
          ? Ux4gDefenseTheme.defenseGreen
          : (isEmergency ? Ux4gDefenseTheme.crisisRed : Ux4gDefenseTheme.mhaNavy),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Docket: PRH-2026-${request.id.toString().padLeft(5, "0")}',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.0, letterSpacing: 0.3),
              ),
              Ux4gBadge(
                text: isResolved
                    ? 'RESOLVED'
                    : (isEmergency ? '12h FAST-LANE' : 'UNDER REVIEW'),
                type: isResolved
                    ? Ux4gBadgeType.success
                    : (isEmergency ? Ux4gBadgeType.danger : Ux4gBadgeType.info),
              ),
            ],
          ),

          const SizedBox(height: 8.0),

          Text(
            request.category.replaceAll('_', ' ').toUpperCase(),
            style: TextStyle(
              fontSize: 12.0,
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFF60A5FA) : Ux4gDefenseTheme.mhaNavy,
            ),
          ),

          const SizedBox(height: 4.0),

          Text(
            request.description ?? 'No additional details provided.',
            style: TextStyle(
              fontSize: 12.5,
              color: isDark ? Colors.white70 : Colors.black87,
              height: 1.3,
            ),
          ),

          const SizedBox(height: 12.0),
          const Divider(),
          const SizedBox(height: 8.0),

          // SLA Countdown Box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
            decoration: BoxDecoration(
              color: isResolved
                  ? const Color(0xFFDCFCE7)
                  : (remainingSeconds <= 0 ? const Color(0xFFFEE2E2) : const Color(0xFFEFF6FF)),
              borderRadius: BorderRadius.circular(4.0),
            ),
            child: Row(
              children: [
                Icon(
                  isResolved ? Icons.check_circle : (remainingSeconds <= 0 ? Icons.warning : Icons.timer),
                  size: 16.0,
                  color: isResolved
                      ? const Color(0xFF166534)
                      : (remainingSeconds <= 0 ? const Color(0xFF991B1B) : const Color(0xFF1E40AF)),
                ),
                const SizedBox(width: 8.0),
                Expanded(
                  child: Text(
                    slaCountdownText,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: isResolved
                          ? const Color(0xFF166534)
                          : (remainingSeconds <= 0 ? const Color(0xFF991B1B) : const Color(0xFF1E40AF)),
                    ),
                  ),
                ),
                Text(
                  createdAtStr,
                  style: const TextStyle(fontSize: 10.5, color: Colors.grey),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12.0),

          // 6-Stage Lifecycle Progress
          _buildStageTimeline(isResolved ? 6 : 3, isDark),
        ],
      ),
    );
  }

  Widget _buildStageTimeline(int currentStage, bool isDark) {
    final stages = ['Filed', 'Ops Check', 'Review', 'Decision', 'Relief', 'Closed'];

    return Row(
      children: List.generate(stages.length, (idx) {
        final step = idx + 1;
        final isPassed = step <= currentStage;

        return Expanded(
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 2.0,
                      color: idx == 0
                          ? Colors.transparent
                          : (isPassed ? Ux4gDefenseTheme.defenseGreen : Colors.grey.shade400),
                    ),
                  ),
                  Container(
                    width: 14.0,
                    height: 14.0,
                    decoration: BoxDecoration(
                      color: isPassed ? Ux4gDefenseTheme.defenseGreen : Colors.transparent,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isPassed ? Ux4gDefenseTheme.defenseGreen : Colors.grey.shade400,
                        width: 1.5,
                      ),
                    ),
                    child: isPassed
                        ? const Icon(Icons.check, size: 9.0, color: Colors.white)
                        : null,
                  ),
                  Expanded(
                    child: Container(
                      height: 2.0,
                      color: idx == stages.length - 1
                          ? Colors.transparent
                          : (step < currentStage ? Ux4gDefenseTheme.defenseGreen : Colors.grey.shade400),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4.0),
              Text(
                stages[idx],
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: isPassed ? FontWeight.bold : FontWeight.normal,
                  color: isPassed
                      ? (isDark ? Colors.white : Colors.black87)
                      : (isDark ? Colors.white38 : Colors.grey),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}
