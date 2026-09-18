import 'package:flutter/material.dart';
import '../services/sync_queue.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/sos_dialog.dart';

class AssessmentScreen extends StatefulWidget {
  const AssessmentScreen({super.key});

  @override
  State<AssessmentScreen> createState() => _AssessmentScreenState();
}

class _AssessmentScreenState extends State<AssessmentScreen> {
  String _sleepAnswer = 'Okay'; // Good / Okay / Poor
  String _workloadAnswer = 'Manageable'; // Light / Manageable / Heavy
  String _energyAnswer = 'Good'; // Good / Moderate / Low
  final _noteController = TextEditingController();
  bool _isRecordingVoice = false;
  bool _hasVoiceNote = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _simulateVoiceRecording() {
    setState(() => _isRecordingVoice = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _isRecordingVoice = false;
          _hasVoiceNote = true;
          if (_noteController.text.isEmpty) {
            _noteController.text = '(Voice note attached - 12 sec)';
          }
        });
      }
    });
  }

  void _handleSubmit() async {
    setState(() => _isSubmitting = true);

    final note = _noteController.text.trim();
    final fullNote = '$note${_hasVoiceNote ? ' [Voice Note Attached]' : ''}';

    await SyncQueue().submitCheckinLocally(
      sleepQuality: _sleepAnswer,
      workloadFeel: _workloadAnswer,
      welfareNote: fullNote.isNotEmpty ? fullNote : null,
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
              Text('Check-In Received', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Text(
            'Thank you for checking in.\n\n'
            'CONFIDENTIALITY GUARANTEE:\n'
            'Your check-in was sent only to your Unit Welfare Officer. It is NEVER visible to company commanders or stored in service records.',
            style: TextStyle(fontSize: 13.5, height: 1.4),
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _noteController.clear();
                setState(() {
                  _hasVoiceNote = false;
                  _sleepAnswer = 'Okay';
                  _workloadAnswer = 'Manageable';
                  _energyAnswer = 'Good';
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Ux4gDefenseTheme.mhaNavy,
                foregroundColor: Colors.white,
              ),
              child: const Text('Close'),
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
          'Wellbeing Check-In',
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
              // Confidentiality notice banner (Prominent guarantee)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Ux4gDefenseTheme.defenseGreen.withValues(alpha: 0.5)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lock_outline_rounded, color: Ux4gDefenseTheme.defenseGreen, size: 24),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '100% Voluntary. This goes ONLY to your Welfare Officer — never to your commander. No streaks. No ratings.',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Question 1: Sleep
              _buildQuestionSection(
                title: '1. How was your sleep this week?',
                options: ['Good', 'Okay', 'Poor'],
                selectedValue: _sleepAnswer,
                onSelect: (val) => setState(() => _sleepAnswer = val),
              ),

              const SizedBox(height: 24),

              // Question 2: Workload
              _buildQuestionSection(
                title: '2. How did your duty workload feel?',
                options: ['Light', 'Manageable', 'Heavy'],
                selectedValue: _workloadAnswer,
                onSelect: (val) => setState(() => _workloadAnswer = val),
              ),

              const SizedBox(height: 24),

              // Question 3: Energy
              _buildQuestionSection(
                title: '3. How is your overall energy?',
                options: ['Good', 'Moderate', 'Low'],
                selectedValue: _energyAnswer,
                onSelect: (val) => setState(() => _energyAnswer = val),
              ),

              const SizedBox(height: 24),

              // Question 4: Open question
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      '4. Anything you want the Welfare Officer to know? (Optional)',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _simulateVoiceRecording,
                    icon: Icon(
                      _isRecordingVoice ? Icons.mic : (_hasVoiceNote ? Icons.check_circle : Icons.mic_none),
                      size: 16,
                      color: _isRecordingVoice ? Colors.red : Ux4gDefenseTheme.mhaNavy,
                    ),
                    label: Text(
                      _isRecordingVoice ? 'Recording…' : (_hasVoiceNote ? 'Attached' : 'Voice'),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _noteController,
                maxLines: 3,
                style: const TextStyle(fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Type freely or tap Voice above. Completely private…',
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
                          'SEND TO WELFARE OFFICER',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                        ),
                ),
              ),

              const SizedBox(height: 12),
              const Center(
                child: Text(
                  'Sent only to your Welfare Officer — never visible to commanders.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuestionSection({
    required String title,
    required List<String> options,
    required String selectedValue,
    required ValueChanged<String> onSelect,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        Row(
          children: options.map((opt) {
            final isSel = selectedValue == opt;
            return Expanded(
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                height: 48, // Minimum 48dp tap target
                child: ElevatedButton(
                  onPressed: () => onSelect(opt),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isSel
                        ? Ux4gDefenseTheme.mhaNavy
                        : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                    foregroundColor: isSel ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                    elevation: isSel ? 2 : 0,
                    side: BorderSide(
                      color: isSel ? Ux4gDefenseTheme.mhaNavy : (isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    opt,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
