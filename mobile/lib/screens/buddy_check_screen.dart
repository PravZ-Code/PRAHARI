import 'package:flutter/material.dart';
import '../services/sync_queue.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/sos_dialog.dart';

class BuddyCheckScreen extends StatefulWidget {
  const BuddyCheckScreen({super.key});

  @override
  State<BuddyCheckScreen> createState() => _BuddyCheckScreenState();
}

class _BuddyCheckScreenState extends State<BuddyCheckScreen> {
  final _nameController = TextEditingController();
  final _noteController = TextEditingController();
  String _concernType = 'Fatigue / Rest';
  bool _isSubmitting = false;

  final List<String> _concernTypes = [
    'Fatigue / Rest',
    'Family Emergency Support',
    'Noticeable Quietness / Withdrawal',
    'Heavy Shift Burden',
    'General Peer Care',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    final colleague = _nameController.text.trim();
    if (colleague.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the name or service number of your colleague')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    await SyncQueue().submitBuddySignalLocally(
      colleagueName: colleague,
      concernType: _concernType,
      note: _noteController.text.trim().isNotEmpty ? _noteController.text.trim() : null,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Ux4gDefenseTheme.defenseGreen, size: 26),
              SizedBox(width: 8),
              Text('Concern Recorded', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Thank you for looking out for your troop.\n\n'
                'CONFIDENTIALITY GUARANTEE:\n'
                'Your name is NEVER shared with the person you are reporting about. The Welfare Officer will check on them discretely as part of standard duty care.',
                style: TextStyle(fontSize: 13.5, height: 1.4),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _nameController.clear();
                _noteController.clear();
                setState(() => _concernType = 'Fatigue / Rest');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Ux4gDefenseTheme.mhaNavy,
                foregroundColor: Colors.white,
              ),
              child: const Text('Done'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Buddy Check',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'Emergency SOS',
            icon: const Icon(Icons.support_agent_rounded, color: Ux4gDefenseTheme.mhaNavy),
            onPressed: () => SosDialog.show(context),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Mandatory anonymity reassurance banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF93C5FD)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.visibility_off_outlined, color: Ux4gDefenseTheme.mhaNavy, size: 24),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Your name is not shared with the person you are reporting about. This observation is strictly confidential.',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // Colleague name or service number
              Text(
                'COLLEAGUE NAME OR SERVICE NUMBER',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _nameController,
                style: const TextStyle(fontSize: 15),
                decoration: InputDecoration(
                  hintText: 'e.g. Constable Suresh or GD-10482',
                  prefixIcon: const Icon(Icons.person_search_outlined, color: Ux4gDefenseTheme.mhaNavy),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),

              const SizedBox(height: 20),

              // Concern type chips
              Text(
                'TYPE OF CONCERN',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _concernTypes.map((type) {
                  final isSel = _concernType == type;
                  return ChoiceChip(
                    label: Text(type, style: TextStyle(fontSize: 13, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                    selected: isSel,
                    selectedColor: Ux4gDefenseTheme.mhaNavy.withValues(alpha: 0.15),
                    onSelected: (val) {
                      if (val) setState(() => _concernType = type);
                    },
                  );
                }).toList(),
              ),

              const SizedBox(height: 20),

              // Optional note
              Text(
                'OBSERVATION / NOTE (OPTIONAL)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _noteController,
                maxLines: 3,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'e.g. Looked exhausted on night duty, or mentioned family emergency at home…',
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),

              const SizedBox(height: 28),

              // Submit Button
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Ux4gDefenseTheme.mhaNavy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                        )
                      : const Text(
                          'SUBMIT ANONYMOUS CHECK',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                        ),
                ),
              ),

              const SizedBox(height: 12),
              const Center(
                child: Text(
                  'Your identity will never be revealed to your colleague.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
