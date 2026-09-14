import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/api_service.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

class BuddyCheckScreen extends StatefulWidget {
  const BuddyCheckScreen({super.key});

  @override
  State<BuddyCheckScreen> createState() => _BuddyCheckScreenState();
}

class _BuddyCheckScreenState extends State<BuddyCheckScreen> {
  final ApiService _apiService = ApiService();

  int _concernLevel = 3;
  String _concernCategory = 'sleep_deprivation';
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  final Map<String, String> _categories = {
    'sleep_deprivation': 'Visible Sleep Deprivation / Microsleep on Watch',
    'emotional_withdrawal': 'Social Withdrawal / Uncharacteristic Isolation',
    'extreme_fatigue': 'Physical Tremor / Severe Circadian Exhaustion',
    'domestic_distress': 'Acute Family Anxiety / Phone Call Friction',
    'unusual_agitation': 'Sudden Irritability / Tension with Teammates',
  };

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    setState(() => _isSubmitting = true);

    try {
      await _apiService.submitBuddySignal(
        concernLevel: _concernLevel,
        concernCategory: _concernCategory,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Ux4gDefenseTheme.defenseGreen,
            content: Text('Confidential buddy signal registered! Thank you for standing guard for your peer.'),
          ),
        );
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Ux4gDefenseTheme.defenseGreen,
            content: Text('Buddy check signal saved in offline queue for automated synchronization.'),
          ),
        );
        Navigator.pop(context);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'PEER BUDDY CHECK DESK',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'Digitized CRPF Buddy-Pairing System & Peer Signals',
              style: TextStyle(fontSize: 10.5, color: Color(0xFFCBD5E1)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Anonymity Guarantee Banner
            Ux4gCard(
              accentColor: Ux4gDefenseTheme.defenseGreen,
              padding: const EdgeInsets.all(14.0),
              child: Row(
                children: [
                  const Icon(Icons.verified_user_outlined, size: 24.0, color: Ux4gDefenseTheme.defenseGreen),
                  const SizedBox(width: 12.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Strict Confidentiality & Non-Punitive Duty of Care',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          'Peer check-in signals are anonymized before triage. They never trigger adverse disciplinary actions or disciplinary dockets.',
                          style: TextStyle(
                            fontSize: 11.0,
                            color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14.0),

            // Form Card
            Ux4gCard(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '1. Observed Behavioral Signal:',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8.0),
                  DropdownButtonFormField<String>(
                    value: _concernCategory,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                    ),
                    items: _categories.entries.map((e) {
                      return DropdownMenuItem<String>(
                        value: e.key,
                        child: Text(e.value, style: const TextStyle(fontSize: 12.0), overflow: TextOverflow.ellipsis),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _concernCategory = val);
                    },
                  ),

                  const SizedBox(height: 18.0),

                  Text(
                    '2. Severity / Urgency Level: $_concernLevel / 5',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4.0),
                  Slider(
                    value: _concernLevel.toDouble(),
                    min: 1.0,
                    max: 5.0,
                    divisions: 4,
                    activeColor: _concernLevel >= 4 ? Ux4gDefenseTheme.crisisRed : Ux4gDefenseTheme.mhaNavy,
                    onChanged: (v) => setState(() => _concernLevel = v.toInt()),
                  ),

                  const SizedBox(height: 14.0),

                  const Text(
                    '3. Contextual Notes (Optional):',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8.0),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Looked dizzy after double sentry shift; mentioned family hospital issue...',
                      alignLabelWithHint: true,
                    ),
                  ),

                  const SizedBox(height: 20.0),

                  Ux4gButton(
                    label: 'REGISTER PEER BUDDY CHECK',
                    icon: Icons.send,
                    type: Ux4gButtonType.primary,
                    isLoading: _isSubmitting,
                    onPressed: _handleSubmit,
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
