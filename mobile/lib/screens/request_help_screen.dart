import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/sync_queue.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/sos_dialog.dart';

class RequestHelpScreen extends StatefulWidget {
  final VoidCallback? onRequestSubmitted;

  const RequestHelpScreen({super.key, this.onRequestSubmitted});

  @override
  State<RequestHelpScreen> createState() => _RequestHelpScreenState();
}

class _RequestHelpScreenState extends State<RequestHelpScreen> {
  String? _selectedCategory; // 'family_emergency', 'leave', 'grievance', 'just_talk'
  String? _selectedSubOption;
  final _noteController = TextEditingController();
  DateTime? _selectedDate;
  bool _isRecordingVoice = false;
  bool _hasVoiceNote = false;
  bool _isSubmitting = false;

  final Map<String, List<String>> _subOptions = {
    'family_emergency': [
      'Medical Emergency',
      'Death in Family',
      'Property / Land Dispute',
      'Financial Crisis',
    ],
    'leave': [
      'Annual Leave',
      'Casual Leave',
      'Emergency Leave',
    ],
    'grievance': [
      'Pay or Allowance',
      'Posting / Transfer Issue',
      'Workplace / Unit Issue',
      'Other Administrative Matter',
    ],
  };

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _handleJustNeedToTalk() async {
    setState(() => _isSubmitting = true);
    await SyncQueue().submitRequestLocally(
      requestType: 'family_crisis',
      category: 'Just Need to Talk',
      description: 'Trooper requested direct, confidential talk with Welfare Officer (no explanation required).',
      isFastLane: true,
    );
    if (mounted) {
      setState(() => _isSubmitting = false);
      _showConfirmationDialog(
        title: 'Request Sent',
        message: 'Your request has been routed directly to your Welfare Officer.\n\nNo reason was required. You will be contacted confidentially within 12 hours.',
      );
    }
  }

  void _handleSubmit() async {
    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please choose a category')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final isFastLane = _selectedCategory == 'family_emergency';
    final sub = _selectedSubOption ?? 'General';
    final note = _noteController.text.trim();
    final fullDescription = '$sub${note.isNotEmpty ? ' — $note' : ''}${_hasVoiceNote ? ' [Voice Note Attached]' : ''}';
    final dateStr = _selectedDate != null ? DateFormat('yyyy-MM-dd').format(_selectedDate!) : null;

    await SyncQueue().submitRequestLocally(
      requestType: _selectedCategory == 'leave' ? 'leave' : (_selectedCategory == 'grievance' ? 'grievance' : 'family_crisis'),
      category: _selectedCategory!,
      description: fullDescription,
      startDate: dateStr,
      isFastLane: isFastLane,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      final slaPromise = isFastLane
          ? 'Submitted. An emergency decision is due within 12 hours.\nYou will be notified when it is seen.'
          : 'Submitted. A response is due within 72 hours.\nYou will be told when it is seen.';

      _showConfirmationDialog(
        title: 'Request Submitted',
        message: slaPromise,
      );
    }
  }

  void _showConfirmationDialog({required String title, required String message}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.check_circle, color: Ux4gDefenseTheme.defenseGreen, size: 28),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(fontSize: 14, height: 1.4),
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx); // Close dialog
              if (widget.onRequestSubmitted != null) {
                widget.onRequestSubmitted!();
              }
              Navigator.pop(context); // Return to home
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Ux4gDefenseTheme.mhaNavy,
              foregroundColor: Colors.white,
            ),
            child: const Text('Back to Home'),
          ),
        ],
      ),
    );
  }

  void _simulateVoiceRecording() {
    setState(() => _isRecordingVoice = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _isRecordingVoice = false;
          _hasVoiceNote = true;
          if (_noteController.text.isEmpty) {
            _noteController.text = '(Voice note recorded - 14 sec)';
          }
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Ask for Help',
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
              // Notice banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF93C5FD)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.shield_outlined, color: Ux4gDefenseTheme.mhaNavy, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Your request is confidential and tracked with a strict statutory resolution deadline.',
                        style: TextStyle(fontSize: 12.5, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // CATEGORY 1: JUST NEED TO TALK (ONE TAP, NO FORM)
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                        : [const Color(0xFFF0FDF4), const Color(0xFFDCFCE7)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Ux4gDefenseTheme.defenseGreen, width: 1.5),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: const BoxDecoration(
                      color: Ux4gDefenseTheme.defenseGreen,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 22),
                  ),
                  title: const Text(
                    'Just Need to Talk',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text(
                    'Routes straight to Welfare Officer. No explanation needed. 1 tap.',
                    style: TextStyle(fontSize: 12.5),
                  ),
                  trailing: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleJustNeedToTalk,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Ux4gDefenseTheme.defenseGreen,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Connect', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),

              const SizedBox(height: 24),
              const Row(
                children: [
                  Expanded(child: Divider()),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Text('OR CHOOSE A REQUEST TYPE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                  ),
                  Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: 18),

              // STEP 1: CATEGORY SELECTION (Large tap targets >= 48dp)
              _buildCategoryTile(
                id: 'family_emergency',
                title: 'Family Emergency',
                desc: 'Medical crisis, bereavement, land dispute (12h fast lane)',
                icon: Icons.emergency_outlined,
                color: const Color(0xFFDC2626),
              ),
              const SizedBox(height: 10),

              _buildCategoryTile(
                id: 'leave',
                title: 'Leave Request',
                desc: 'Annual, casual, or emergency relief leave',
                icon: Icons.flight_takeoff_outlined,
                color: Ux4gDefenseTheme.mhaNavy,
              ),
              const SizedBox(height: 10),

              _buildCategoryTile(
                id: 'grievance',
                title: 'Grievance',
                desc: 'Pay, allowances, posting tenure, workplace matter',
                icon: Icons.assignment_outlined,
                color: const Color(0xFF475569),
              ),

              // STEP 2: SUB-OPTION (If category selected)
              if (_selectedCategory != null && _subOptions[_selectedCategory] != null) ...[
                const SizedBox(height: 20),
                Text(
                  'SELECT REASON (${_selectedCategory!.replaceAll('_', ' ').toUpperCase()})',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _subOptions[_selectedCategory]!.map((sub) {
                    final isSel = _selectedSubOption == sub;
                    return ChoiceChip(
                      label: Text(sub, style: TextStyle(fontSize: 13, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                      selected: isSel,
                      selectedColor: Ux4gDefenseTheme.mhaNavy.withValues(alpha: 0.15),
                      onSelected: (val) => setState(() => _selectedSubOption = val ? sub : null),
                    );
                  }).toList(),
                ),
              ],

              // STEP 3: OPTIONAL DATE (For leave / emergency)
              if (_selectedCategory == 'leave' || _selectedCategory == 'family_emergency') ...[
                const SizedBox(height: 20),
                const Text(
                  'PREFERRED DATE (OPTIONAL)',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().add(const Duration(days: 1)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 90)),
                    );
                    if (picked != null) {
                      setState(() => _selectedDate = picked);
                    }
                  },
                  icon: const Icon(Icons.calendar_today, size: 18),
                  label: Text(
                    _selectedDate != null
                        ? 'Date: ${DateFormat('dd MMM yyyy').format(_selectedDate!)}'
                        : 'Select Starting Date (Optional)',
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],

              // STEP 4: SHORT NOTE & VOICE NOTE
              if (_selectedCategory != null) ...[
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'SHORT NOTE (OPTIONAL)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                    ),
                    TextButton.icon(
                      onPressed: _simulateVoiceRecording,
                      icon: Icon(
                        _isRecordingVoice ? Icons.mic : (_hasVoiceNote ? Icons.check_circle : Icons.mic_none),
                        size: 18,
                        color: _isRecordingVoice ? Colors.red : Ux4gDefenseTheme.mhaNavy,
                      ),
                      label: Text(
                        _isRecordingVoice ? 'Recording…' : (_hasVoiceNote ? 'Voice Attached' : 'Speak Note'),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _noteController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'Type brief note or tap Speak Note above…',
                    filled: true,
                    fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),

                const SizedBox(height: 24),

                // SUBMIT BUTTON (Tap 3)
                SizedBox(
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Ux4gDefenseTheme.mhaNavy,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 2,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text(
                            'SUBMIT REQUEST',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                          ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryTile({
    required String id,
    required String title,
    required String desc,
    required IconData icon,
    required Color color,
  }) {
    final isSel = _selectedCategory == id;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: () {
        setState(() {
          _selectedCategory = id;
          _selectedSubOption = null;
        });
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSel
              ? color.withValues(alpha: isDark ? 0.2 : 0.08)
              : (isDark ? const Color(0xFF1E293B) : Colors.white),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSel ? color : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            width: isSel ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: isSel ? color : null,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(desc, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
            Icon(
              isSel ? Icons.check_circle : Icons.radio_button_unchecked,
              color: isSel ? color : Colors.grey,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
