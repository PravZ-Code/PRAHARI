import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/dashboard_provider.dart';

class RequestHelpScreen extends StatefulWidget {
  final VoidCallback? onRequestSubmitted;

  const RequestHelpScreen({super.key, this.onRequestSubmitted});

  @override
  State<RequestHelpScreen> createState() => _RequestHelpScreenState();
}

class _RequestHelpScreenState extends State<RequestHelpScreen> {
  String _selectedRequestType = 'leave'; // 'leave', 'welfare', 'grievance', 'family_crisis'
  String _selectedCategory = 'family_emergency';
  final _descriptionController = TextEditingController();
  DateTime _startDate = DateTime.now().add(const Duration(days: 1));
  DateTime _endDate = DateTime.now().add(const Duration(days: 10));
  bool _isSubmitting = false;

  final Map<String, List<Map<String, String>>> _typeOptions = {
    'leave': [
      {'id': 'family_emergency', 'name': 'Family Medical Emergency (Fast-Track 72h)', 'fast_lane': 'true'},
      {'id': 'medical_emergency', 'name': 'Personal Acute Medical Care', 'fast_lane': 'true'},
      {'id': 'bereavement', 'name': 'Bereavement / Death in Family', 'fast_lane': 'true'},
      {'id': 'acute_domestic_crisis', 'name': 'Urgent Domestic Crisis / Court Matter', 'fast_lane': 'true'},
      {'id': 'annual_leave', 'name': 'Routine Annual Leave Rotation', 'fast_lane': 'false'},
    ],
    'welfare': [
      {'id': 'family_crisis', 'name': 'Family Support & Welfare Assistance', 'fast_lane': 'true'},
      {'id': 'mental_health_support', 'name': 'Confidential Stress & Counseling Assistance', 'fast_lane': 'true'},
      {'id': 'children_education', 'name': 'Children Education / Dependent Support', 'fast_lane': 'false'},
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
          backgroundColor: Color(0xFFEF4444),
          content: Text('Please provide details describing the nature of your request.'),
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
            backgroundColor: const Color(0xFF10B981),
            content: Text(
              _isFastLane
                  ? '72-Hour Fast-Track request submitted with active statutory SLA timer!'
                  : 'Your request has been filed and routed for human administrative review.',
            ),
          ),
        );
        widget.onRequestSubmitted?.call();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFEF4444),
            content: Text(dash.errorMessage ?? 'Failed to submit request. Please try again.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentCategoryList = _typeOptions[_selectedRequestType] ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'REQUEST HELP & SUPPORT',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Self-Service Welfare, Leave & Grievance Resolution',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Human-first assistance guarantee banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF10B981).withValues(alpha: 0.15),
                  const Color(0xFF1E293B),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.volunteer_activism, color: Color(0xFF10B981), size: 22),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Direct Support - No AI Gatekeeping',
                        style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'You can request emergency leave, welfare assistance, or air grievances directly at any time. Family emergency requests are prioritized via guaranteed 72h SLA countdowns.',
                        style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // 1. Select Request Type Tabs
          const Text(
            'SELECT REQUEST PATHWAY',
            style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1),
          ),
          const SizedBox(height: 10),

          Row(
            children: [
              _buildTypeCard(
                type: 'leave',
                title: 'Emergency Leave',
                icon: Icons.flight_takeoff,
                selected: _selectedRequestType == 'leave',
              ),
              const SizedBox(width: 8),
              _buildTypeCard(
                type: 'welfare',
                title: 'Welfare Support',
                icon: Icons.favorite_border,
                selected: _selectedRequestType == 'welfare',
              ),
              const SizedBox(width: 8),
              _buildTypeCard(
                type: 'grievance',
                title: 'Grievance / Pay',
                icon: Icons.report_problem_outlined,
                selected: _selectedRequestType == 'grievance',
              ),
            ],
          ),

          const SizedBox(height: 20),

          // 2. Select Specific Category
          const Text(
            'SPECIFIC CATEGORY',
            style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1),
          ),
          const SizedBox(height: 10),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: currentCategoryList.any((e) => e['id'] == _selectedCategory)
                    ? _selectedCategory
                    : currentCategoryList.first['id'],
                isExpanded: true,
                dropdownColor: const Color(0xFF1E293B),
                style: const TextStyle(color: Colors.white, fontSize: 13),
                icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF10B981)),
                items: currentCategoryList.map((cat) {
                  final isFast = cat['fast_lane'] == 'true';
                  return DropdownMenuItem<String>(
                    value: cat['id'],
                    child: Row(
                      children: [
                        if (isFast)
                          const Padding(
                            padding: EdgeInsets.only(right: 6),
                            child: Icon(Icons.bolt, color: Color(0xFFFBBF24), size: 16),
                          ),
                        Expanded(child: Text(cat['name']!)),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
            ),
          ),

          // Fast lane status indicator
          if (_isFastLane) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFBBF24).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.4)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.bolt, color: Color(0xFFFBBF24), size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Fast-Track Priority: Automatic 72-Hour SLA Countdown enabled with hierarchical welfare escalation.',
                      style: TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // 3. Date Selection (if leave)
          if (_selectedRequestType == 'leave') ...[
            const SizedBox(height: 20),
            const Text(
              'LEAVE PERIOD (PROPOSED)',
              style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildDateTile(
                    label: 'From Date',
                    date: _startDate,
                    onTap: () async {
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
                const SizedBox(width: 10),
                Expanded(
                  child: _buildDateTile(
                    label: 'To Date',
                    date: _endDate,
                    onTap: () async {
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

          const SizedBox(height: 20),

          // 4. Description Field
          const Text(
            'SITUATION & JUSTIFICATION',
            style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.1),
          ),
          const SizedBox(height: 10),

          TextField(
            controller: _descriptionController,
            maxLines: 4,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Describe the family situation, location, or urgent support needed...',
              hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
              filled: true,
              fillColor: const Color(0xFF1E293B),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFF334155)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFF10B981)),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Human approval reminder
          const Row(
            children: [
              Icon(Icons.verified_outlined, color: Colors.white38, size: 14),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Per MHA operational doctrine, consequential leave and duty decisions require human officer sign-off.',
                  style: TextStyle(color: Colors.white38, fontSize: 10),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Submit Button
          ElevatedButton(
            onPressed: _isSubmitting ? null : _handleSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.send, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'SUBMIT REQUEST TO BATTALION',
                        style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.0),
                      ),
                    ],
                  ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildTypeCard({
    required String type,
    required String title,
    required IconData icon,
    required bool selected,
  }) {
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedRequestType = type;
            _selectedCategory = _typeOptions[type]!.first['id']!;
          });
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF10B981).withValues(alpha: 0.2) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? const Color(0xFF10B981) : const Color(0xFF334155),
              width: selected ? 1.5 : 1.0,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: selected ? const Color(0xFF10B981) : Colors.white60, size: 22),
              const SizedBox(height: 6),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: selected ? Colors.white : Colors.white70,
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDateTile({
    required String label,
    required DateTime date,
    required VoidCallback onTap,
  }) {
    final fmt = DateFormat('dd MMM yyyy');
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Colors.white54, fontSize: 10)),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.calendar_month, color: Color(0xFF10B981), size: 16),
                const SizedBox(width: 6),
                Text(fmt.format(date), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
