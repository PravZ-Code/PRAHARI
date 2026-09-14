import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

import 'request_help_screen.dart';
import 'my_requests_screen.dart';
import 'duty_roster_screen.dart';
import 'buddy_check_screen.dart';
import 'copilot_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateToTab;

  const HomeDashboardScreen({super.key, this.onNavigateToTab});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadDashboard();
    });
  }

  void _showSosDialog() {
    final themeLocale = context.read<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? Ux4gDefenseTheme.surfaceDark : Colors.white,
        title: Row(
          children: const [
            Icon(Icons.warning_amber_rounded, color: Ux4gDefenseTheme.crisisRed, size: 24.0),
            SizedBox(width: 8.0),
            Text('12-Hour Urgent Welfare SOS', style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Initiate an immediate, confidential welfare assistance request under Section 21 MHCA 2017? '
          'This activates a mandatory 12-hour resolution SLA with zero disciplinary records.',
          style: TextStyle(fontSize: 13.0, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Ux4gDefenseTheme.crisisRed,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<DashboardProvider>().triggerSos(
                'Urgent SOS assistance requested by personnel via mobile home screen.',
              );
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: success ? Ux4gDefenseTheme.defenseGreen : Ux4gDefenseTheme.crisisRed,
                    content: Text(
                      success
                          ? 'Welfare Officer notified! High-priority 12h SLA active.'
                          : 'SOS request queued for offline sync.',
                    ),
                  ),
                );
              }
            },
            child: const Text('CONFIRM SOS', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final dash = context.watch<DashboardProvider>();
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    final prof = auth.profile;
    final user = auth.user;

    final displayName = prof?.name ?? user?.name ?? dash.soldierName;
    final displayRank = prof?.rank ?? user?.rank ?? dash.soldierRank;
    final displayUnit = prof?.unitName ?? user?.unitName ?? 'Alpha Company, 79 Bn CRPF';
    final serviceNumber = prof?.serviceNumber ?? user?.serviceNumber ?? 'GD-10492';

    return RefreshIndicator(
      onRefresh: () => context.read<DashboardProvider>().loadDashboard(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Frontline Trooper Tactical Header Card
            Ux4gCard(
              accentColor: Ux4gDefenseTheme.mhaNavy,
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        height: 48.0,
                        width: 48.0,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                          shape: BoxShape.circle,
                          border: Border.all(color: Ux4gDefenseTheme.mhaNavyLight, width: 1.5),
                        ),
                        child: Center(
                          child: Text(
                            displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : 'T',
                            style: TextStyle(
                              fontSize: 20.0,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Ux4gDefenseTheme.mhaNavy,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$displayRank $displayName',
                              style: TextStyle(
                                fontSize: 16.0,
                                fontWeight: FontWeight.bold,
                                color: isDark ? Colors.white : Ux4gDefenseTheme.textPrimaryLight,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            Text(
                              'Service No: $serviceNumber | $displayUnit',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Ux4gBadge(
                        text: 'ACTIVE DUTY',
                        type: Ux4gBadgeType.success,
                        icon: Icons.shield,
                      ),
                    ],
                  ),

                  const SizedBox(height: 12.0),
                  const Divider(),
                  const SizedBox(height: 8.0),

                  // Rest Barrier Compliance Indicator
                  Row(
                    children: [
                      const Icon(Icons.bedtime_outlined, size: 16.0, color: Ux4gDefenseTheme.defenseGreen),
                      const SizedBox(width: 6.0),
                      Text(
                        '8-Hour Circadian Rest Barrier: ',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black87,
                        ),
                      ),
                      const Ux4gBadge(
                        text: 'COMPLIANT (9.5h Rest)',
                        type: Ux4gBadgeType.success,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8.0),

            // Operational Strain & Active Leave SLA Row
            Row(
              children: [
                // Prospective Strain Index Card
                Expanded(
                  child: Ux4gCard(
                    accentColor: dash.stressPercentage >= 70
                        ? Ux4gDefenseTheme.crisisRed
                        : (dash.stressPercentage >= 40 ? Ux4gDefenseTheme.tacticalAmber : Ux4gDefenseTheme.defenseGreen),
                    padding: const EdgeInsets.all(14.0),
                    onTap: () {
                      if (widget.onNavigateToTab != null) {
                        widget.onNavigateToTab!(3); // Strain tab
                      }
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'STRAIN SCORE',
                              style: TextStyle(
                                fontSize: 11.0,
                                fontWeight: FontWeight.bold,
                                color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                                letterSpacing: 0.4,
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios, size: 12.0),
                          ],
                        ),
                        const SizedBox(height: 8.0),
                        Text(
                          '${dash.stressPercentage}%',
                          style: TextStyle(
                            fontSize: 26.0,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : Ux4gDefenseTheme.textPrimaryLight,
                          ),
                        ),
                        const SizedBox(height: 4.0),
                        Ux4gBadge(
                          text: dash.riskCategory.name.toUpperCase(),
                          type: dash.stressPercentage >= 70
                              ? Ux4gBadgeType.danger
                              : (dash.stressPercentage >= 40 ? Ux4gBadgeType.warning : Ux4gBadgeType.success),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 8.0),

                // Active Leave / SLA Docket Card
                Expanded(
                  child: Ux4gCard(
                    accentColor: Ux4gDefenseTheme.mhaNavy,
                    padding: const EdgeInsets.all(14.0),
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const MyRequestsScreen()));
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'ACTIVE LEAVE SLA',
                              style: TextStyle(
                                fontSize: 11.0,
                                fontWeight: FontWeight.bold,
                                color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                                letterSpacing: 0.4,
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios, size: 12.0),
                          ],
                        ),
                        const SizedBox(height: 8.0),
                        Text(
                          '${dash.activeGrievances.length} Pending',
                          style: TextStyle(
                            fontSize: 22.0,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : Ux4gDefenseTheme.textPrimaryLight,
                          ),
                        ),
                        const SizedBox(height: 6.0),
                        const Ux4gBadge(
                          text: '72h SLA ACTIVE',
                          type: Ux4gBadgeType.info,
                          icon: Icons.timer_outlined,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12.0),

            // Fast-Track 12h Crisis SOS Banner
            Ux4gCard(
              accentColor: Ux4gDefenseTheme.crisisRed,
              padding: const EdgeInsets.all(14.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: Ux4gDefenseTheme.crisisRed.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    child: const Icon(Icons.emergency_share, color: Ux4gDefenseTheme.crisisRed, size: 28.0),
                  ),
                  const SizedBox(width: 12.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '12-Hour Urgent Emergency Desk',
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                            color: Ux4gDefenseTheme.crisisRed,
                          ),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          'Immediate statutory relief for family crises and acute stress under Section 21 MHCA 2017.',
                          style: TextStyle(
                            fontSize: 11.0,
                            color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Ux4gDefenseTheme.crisisRed,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4.0)),
                    ),
                    onPressed: _showSosDialog,
                    child: const Text('SOS', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.0)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14.0),

            // Tactical Welfare Core Services Section Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.0, vertical: 4.0),
              child: Text(
                'GOVERNMENT TACTICAL WELFARE SERVICES',
                style: TextStyle(
                  fontSize: 12.0,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                  color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                ),
              ),
            ),

            const SizedBox(height: 6.0),

            // Quick Actions Grid (UX4G Outlined & Filled Buttons)
            Row(
              children: [
                Expanded(
                  child: Ux4gButton(
                    label: 'Apply Leave',
                    icon: Icons.assignment_add,
                    type: Ux4gButtonType.primary,
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const RequestHelpScreen()),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8.0),
                Expanded(
                  child: Ux4gButton(
                    label: 'Duty Roster',
                    icon: Icons.calendar_month,
                    type: Ux4gButtonType.outline,
                    onPressed: () {
                      if (widget.onNavigateToTab != null) {
                        widget.onNavigateToTab!(1);
                      } else {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const DutyRosterScreen()));
                      }
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8.0),

            Row(
              children: [
                Expanded(
                  child: Ux4gButton(
                    label: 'Buddy Check',
                    icon: Icons.group_outlined,
                    type: Ux4gButtonType.outline,
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const BuddyCheckScreen()));
                    },
                  ),
                ),
                const SizedBox(width: 8.0),
                Expanded(
                  child: Ux4gButton(
                    label: 'AI Copilot',
                    icon: Icons.smart_toy_outlined,
                    type: Ux4gButtonType.outline,
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const CopilotScreen()));
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16.0),

            // Recent Duty Shift & Roster Inspection Card
            Ux4gCard(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.schedule, size: 18.0, color: Ux4gDefenseTheme.mhaNavy),
                          SizedBox(width: 8.0),
                          Text(
                            'Assigned Operational Shift',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                          ),
                        ],
                      ),
                      const Ux4gBadge(text: 'SCHEDULED', type: Ux4gBadgeType.info),
                    ],
                  ),
                  const SizedBox(height: 12.0),
                  Container(
                    padding: const EdgeInsets.all(12.0),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(color: isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: const [
                            Text('Post / Location:', style: TextStyle(fontSize: 12.0, color: Colors.grey)),
                            Text('Post Alpha-4 (Perimeter Watch)', style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.w700)),
                          ],
                        ),
                        const SizedBox(height: 6.0),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: const [
                            Text('Shift Window:', style: TextStyle(fontSize: 12.0, color: Colors.grey)),
                            Text('06:00 - 14:00 hrs (Morning)', style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.w700)),
                          ],
                        ),
                        const SizedBox(height: 6.0),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: const [
                            Text('Next Scheduled Rest:', style: TextStyle(fontSize: 12.0, color: Colors.grey)),
                            Text('14:00 - 22:00 hrs (Guaranteed 8h)', style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.w700, color: Ux4gDefenseTheme.defenseGreen)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16.0),

            // National Tele-MANAS Referral Banner
            Container(
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(6.0),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.phone_in_talk, color: Color(0xFF1D4ED8), size: 22.0),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'National Tele-MANAS (24x7 Statutory Helpline)',
                          style: TextStyle(
                            color: Color(0xFF1E3A8A),
                            fontSize: 12.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 2.0),
                        Text(
                          'Dial 14416 (Toll-Free) for immediate confidential clinical care.',
                          style: TextStyle(color: Color(0xFF1D4ED8), fontSize: 11.0),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
