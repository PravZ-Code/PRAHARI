import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dashboard_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

class RequestHelpScreen extends StatefulWidget {
  final VoidCallback? onRequestSubmitted;

  const RequestHelpScreen({super.key, this.onRequestSubmitted});

  @override
  State<RequestHelpScreen> createState() => _RequestHelpScreenState();
}

class _RequestHelpScreenState extends State<RequestHelpScreen> {
  String _selectedRequestType = 'leave';
  String _selectedCategory = 'family_emergency';
  final _descriptionController = TextEditingController();
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  DateTime _endDate = DateTime.now().add(const Duration(days: 10));
  bool _isSubmitting = false;

  final Map<String, List<Map<String, String>>> _typeOptions = {
    'leave': [
      {'id': 'family_emergency', 'name': 'Family Medical Emergency (12h Fast-Track)', 'fast_lane': 'true'},
      {'id': 'bereavement', 'name': 'Bereavement / Death in Family (12h Fast-Track)', 'fast_lane': 'true'},
      {'id': 'medical_emergency', 'name': 'Personal Acute Medical Care', 'fast_lane': 'true'},
      {'id': 'acute_domestic_crisis', 'name': 'Urgent Domestic Crisis / Land Dispute', 'fast_lane': 'true'},
      {'id': 'annual_leave', 'name': 'Routine Annual Leave Rotation', 'fast_lane': 'false'},
    ],
    'welfare': [
      {'id': 'family_crisis', 'name': 'Family Support & Welfare Outreach', 'fast_lane': 'true'},
      {'id': 'mental_health_support', 'name': 'Confidential Stress & Counseling Assistance', 'fast_lane': 'true'},
      {'id': 'children_education', 'name': 'Children Education / Dependent Relief', 'fast_lane': 'false'},
      {'id': 'financial_welfare', 'name': 'Unit Welfare Fund / Emergency Advance', 'fast_lane': 'false'},
    ],
    'grievance': [
      {'id': 'service_pay_delay', 'name': 'Pay, Allowance or Field Risk Allowance Delay', 'fast_lane': 'false'},
      {'id': 'accommodation_facilities', 'name': 'Barrack / Living Quarters Grievance', 'fast_lane': 'false'},
      {'id': 'medical_claim_pending', 'name': 'Medical Reimbursement Claim Follow-up', 'fast_lane': 'false'},
      {'id': 'other_grievance', 'name': 'Other Administrative Grievance', 'fast_lane': 'false'},
    ],
  };

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  bool get _isFastLane {
    final list = _typeOptions[_selectedRequestType] ?? [];
    final match = list.firstWhere((e) => e['id'] == _selectedCategory, orElse: () => {'fast_lane': 'false'});
    return match['fast_lane'] == 'true';
  }

  void _handleSubmit() async {
    final desc = _descriptionController.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Ux4gDefenseTheme.crisisRed,
          content: Text('Please provide specific details describing your welfare or leave request.'),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final dash = context.read<DashboardProvider>();
    final dateFormat = DateFormat('yyyy-MM-dd');

    final success = await dash.submitPersonnelRequest(
      requestType: _selectedRequestType,
      category: _selectedCategory,
      description: desc,
      startDate: _selectedRequestType == 'leave' ? dateFormat.format(_startDate) : null,
      endDate: _selectedRequestType == 'leave' ? dateFormat.format(_endDate) : null,
    );

    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        _descriptionController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Ux4gDefenseTheme.defenseGreen,
            content: Text(
              _isFastLane
                  ? 'Fast-Track Emergency Request submitted! Statutory 12h resolution timer activated.'
                  : 'Official welfare request registered! Routed for human command review.',
            ),
          ),
        );
        widget.onRequestSubmitted?.call();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Ux4gDefenseTheme.crisisRed,
            content: Text('Failed to submit request. Stored in offline queue for automatic retry.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;
    final dateFormat = DateFormat('dd MMM yyyy');

    final currentOptions = _typeOptions[_selectedRequestType] ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // GIGW 3.0 Service Desk Header Card
          Ux4gCard(
            accentColor: _isFastLane ? Ux4gDefenseTheme.crisisRed : Ux4gDefenseTheme.mhaNavy,
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'STRUCTURED WELFARE & LEAVE DESK',
                      style: TextStyle(
                        fontSize: 13.0,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: isDark ? Colors.white : Ux4gDefenseTheme.mhaNavy,
                      ),
                    ),
                    Ux4gBadge(
                      text: _isFastLane ? '12h FAST-LANE' : '72h STANDARD',
                      type: _isFastLane ? Ux4gBadgeType.danger : Ux4gBadgeType.info,
                      icon: _isFastLane ? Icons.bolt : Icons.schedule,
                    ),
                  ],
                ),
                const SizedBox(height: 6.0),
                Text(
                  _isFastLane
                      ? 'Statutory emergency priority under Section 21 MHCA 2017: guaranteed hierarchical escalation within 12 hours.'
                      : 'Formal service leave and administrative petition desk with tamper-evident audit logging.',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14.0),

          // Request Form Card
          Ux4gCard(
            padding: const EdgeInsets.all(18.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Request Type Selector
                const Text(
                  '1. Select Request Domain:',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8.0),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'leave', label: Text('Leave Desk', style: TextStyle(fontSize: 11.5))),
                    ButtonSegment(value: 'welfare', label: Text('Welfare Aid', style: TextStyle(fontSize: 11.5))),
                    ButtonSegment(value: 'grievance', label: Text('Grievance', style: TextStyle(fontSize: 11.5))),
                  ],
                  selected: {_selectedRequestType},
                  onSelectionChanged: (set) {
                    setState(() {
                      _selectedRequestType = set.first;
                      _selectedCategory = _typeOptions[_selectedRequestType]!.first['id']!;
                    });
                  },
                ),

                const SizedBox(height: 18.0),

                // Specific Category Dropdown
                const Text(
                  '2. Specific Category / Reason:',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8.0),
                DropdownButtonFormField<String>(
                  value: _selectedCategory,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    contentPadding: EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                  ),
                  items: currentOptions.map((opt) {
                    final isEmergency = opt['fast_lane'] == 'true';
                    return DropdownMenuItem<String>(
                      value: opt['id'],
                      child: Row(
                        children: [
                          if (isEmergency)
                            const Icon(Icons.flash_on, color: Ux4gDefenseTheme.crisisRed, size: 16.0)
                          else
                            const Icon(Icons.article_outlined, color: Ux4gDefenseTheme.mhaNavy, size: 16.0),
                          const SizedBox(width: 8.0),
                          Expanded(
                            child: Text(
                              opt['name']!,
                              style: const TextStyle(fontSize: 12.5),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedCategory = val);
                  },
                ),

                if (_selectedRequestType == 'leave') ...[
                  const SizedBox(height: 18.0),
                  const Text(
                    '3. Leave Duration (From - To):',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8.0),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 8.0),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6.0)),
                          ),
                          icon: const Icon(Icons.calendar_today, size: 15.0),
                          label: Text(
                            dateFormat.format(_startDate),
                            style: const TextStyle(fontSize: 12.0, fontWeight: FontWeight.w600),
                          ),
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _startDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) setState(() => _startDate = picked);
                          },
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8.0),
                        child: Text('to', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 8.0),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6.0)),
                          ),
                          icon: const Icon(Icons.calendar_today, size: 15.0),
                          label: Text(
                            dateFormat.format(_endDate),
                            style: const TextStyle(fontSize: 12.0, fontWeight: FontWeight.w600),
                          ),
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _endDate,
                              firstDate: _startDate,
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) setState(() => _endDate = picked);
                          },
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 18.0),

                // Description Text Area
                const Text(
                  '4. Detailed Circumstances / Explanation:',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8.0),
                TextField(
                  controller: _descriptionController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'State specific factual details (e.g. Hospital admission, family emergency, court summons date)...',
                    alignLabelWithHint: true,
                  ),
                ),

                const SizedBox(height: 22.0),

                // Submit Action
                Ux4gButton(
                  label: _isFastLane ? 'SUBMIT 12h FAST-TRACK REQUEST' : 'SUBMIT OFFICIAL PETITION',
                  icon: _isFastLane ? Icons.bolt : Icons.send,
                  type: _isFastLane ? Ux4gButtonType.crisis : Ux4gButtonType.primary,
                  isLoading: _isSubmitting,
                  onPressed: _handleSubmit,
                ),
              ],
            ),
          ),

          const SizedBox(height: 14.0),

          // Statutory Protection Note per Section 21 MHCA 2017
          Container(
            padding: const EdgeInsets.all(12.0),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(6.0),
              border: Border.all(color: isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight),
            ),
            child: Row(
              children: const [
                Icon(Icons.gavel, size: 18.0, color: Ux4gDefenseTheme.mhaNavy),
                SizedBox(width: 8.0),
                Expanded(
                  child: Text(
                    'Statutory Confidentiality: Grievances and welfare requests are protected under Section 21 of the Mental Healthcare Act 2017 & Section 7 DPDP Act 2023. Submissions cannot be used in annual confidential reports (ACR) or disciplinary proceedings.',
                    style: TextStyle(fontSize: 10.5, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
