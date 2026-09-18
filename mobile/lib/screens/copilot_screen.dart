import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/api_service.dart';
import '../theme/ux4g_defense_theme.dart';

class CopilotScreen extends StatefulWidget {
  const CopilotScreen({super.key});

  @override
  State<CopilotScreen> createState() => _CopilotScreenState();
}

class _CopilotScreenState extends State<CopilotScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool _isLoading = false;
  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'text':
          'Jai Hind, Trooper! I am Prahari Sahayak (प्रहरी सहायक), your confidential AI Tactical Welfare & Rest Copilot.\n\n'
          'I provide authoritative guidance on:\n'
          '• 12-Hour Urgent Emergency Leave procedures and SLA escalation.\n'
          '• Mandatory 8-Hour Circadian Rest Regulations (MHA Standing Order SO-04).\n'
          '• Trade-Matched Shift Swaps via the Hungarian Bipartite Optimizer (URO).\n'
          '• Statutory Confidentiality protections under Section 21 MHCA 2017 & DPDP Act 2023.\n\n'
          'All inquiries are confidential, non-punitive, and untracked in ACR records. How can I assist you?',
    }
  ];

  final List<String> _quickPrompts = [
    '12h Fast-Track Leave Rules',
    '8h Rest Gap Barrier (SO-04)',
    'URO Shift Swap Eligibility',
    'Section 21 MHCA Privacy Charter',
    'Tele-MANAS Helpline Info',
  ];

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage(String text) async {
    final query = text.trim();
    if (query.isEmpty) return;

    _textController.clear();
    setState(() {
      _messages.add({'role': 'user', 'text': query});
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final history = _messages.map((m) => {'role': m['role']!, 'content': m['text']!}).toList();
      final res = await _apiService.chatWithCopilot(message: query, history: history);

      final reply = res['reply'] ?? res['response'] ?? 'I have recorded your query. Please consult your Company Commander or Unit Welfare Officer for immediate relief.';
      setState(() {
        _messages.add({'role': 'assistant', 'text': reply});
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (_) {
      // Deterministic defense clinical fallback
      String fallback;
      final qLower = query.toLowerCase();
      if (qLower.contains('leave') || qLower.contains('sla')) {
        fallback = 'Under PRAHARI leave regulations, emergency requests carry a 12-hour statutory decision window. If unaddressed past the SLA deadline, the request automatically escalates to the Battalion 2IC without requiring a re-petition.';
      } else if (qLower.contains('rest') || qLower.contains('sleep') || qLower.contains('fatigue')) {
        fallback = 'MHA Standing Order SO-04 mandates an 8-hour continuous circadian rest barrier between armed shifts. Shift swaps that violate replacement rest limits are automatically blocked by the Hungarian Bipartite Optimizer.';
      } else {
        fallback = 'Statutory notice: Under Section 21 of the Mental Healthcare Act 2017, personnel seeking welfare support or clinical counseling are protected against disciplinary stigmatization. For immediate support, call Tele-MANAS at 14416.';
      }

      setState(() {
        _messages.add({'role': 'assistant', 'text': fallback});
        _isLoading = false;
      });
      _scrollToBottom();
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
              'AI TACTICAL WELFARE COPILOT',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'Prahari Sahayak — Air-Gapped Confidential Guide',
              style: TextStyle(fontSize: 10.5, color: Color(0xFFCBD5E1)),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick Tactical Prompts Bar
          Container(
            height: 44.0,
            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 6.0),
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _quickPrompts.length,
              separatorBuilder: (ctx, idx) => const SizedBox(width: 8.0),
              itemBuilder: (ctx, idx) {
                return ActionChip(
                  label: Text(_quickPrompts[idx], style: const TextStyle(fontSize: 11.0, fontWeight: FontWeight.bold)),
                  backgroundColor: isDark ? Ux4gDefenseTheme.surfaceDark : Colors.white,
                  side: BorderSide(color: isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight),
                  onPressed: _isLoading ? null : () => _sendMessage(_quickPrompts[idx]),
                );
              },
            ),
          ),

          // Messages Stream
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
              itemCount: _messages.length,
              itemBuilder: (ctx, idx) {
                final msg = _messages[idx];
                final isUser = msg['role'] == 'user';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 6.0),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                    padding: const EdgeInsets.all(14.0),
                    decoration: BoxDecoration(
                      color: isUser
                          ? (isDark ? const Color(0xFF1E3A8A) : Ux4gDefenseTheme.mhaNavy)
                          : (isDark ? Ux4gDefenseTheme.surfaceDark : Colors.white),
                      borderRadius: BorderRadius.circular(8.0),
                      border: Border.all(
                        color: isUser
                            ? Ux4gDefenseTheme.mhaNavyLight
                            : (isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight),
                      ),
                      boxShadow: Ux4gDefenseTheme.elevationLevel1(isDark),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isUser ? Icons.person : Icons.smart_toy_outlined,
                              size: 14.0,
                              color: isUser ? Colors.white70 : Ux4gDefenseTheme.indiaSaffron,
                            ),
                            const SizedBox(width: 6.0),
                            Text(
                              isUser ? 'You' : 'Prahari Sahayak',
                              style: TextStyle(
                                fontSize: 11.0,
                                fontWeight: FontWeight.bold,
                                color: isUser ? Colors.white70 : Ux4gDefenseTheme.indiaSaffron,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6.0),
                        Text(
                          msg['text']!,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: isUser ? Colors.white : (isDark ? Colors.white : Colors.black87),
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          if (_isLoading)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  SizedBox(width: 14.0, height: 14.0, child: CircularProgressIndicator(strokeWidth: 2.0)),
                  SizedBox(width: 8.0),
                  Text('AI Copilot analyzing regulatory and welfare databases...', style: TextStyle(fontSize: 11.5, color: Colors.grey)),
                ],
              ),
            ),

          // Input Text Box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: const InputDecoration(
                      hintText: 'Type your welfare or leave inquiry here...',
                      contentPadding: EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8.0),
                IconButton(
                  style: IconButton.styleFrom(
                    backgroundColor: Ux4gDefenseTheme.mhaNavy,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.send, size: 18.0),
                  onPressed: () => _sendMessage(_textController.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
