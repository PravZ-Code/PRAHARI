import 'package:flutter/material.dart';
import '../services/api_service.dart';

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
          'Jai Hind! I am **Prahari Sahayak (प्रहरी सहायक)**, your dedicated AI Welfare and Operational Rest Copilot.\n\n'
          'I am here to assist you with:\n'
          '• **72-Hour Emergency Leave** procedures and SLA escalation.\n'
          '• **Mandatory 8-Hour Rest Regulations** (MHA Standing Order SO-04).\n'
          '• **Equal-Trade Shift Swaps** via the Unit Resilience Optimizer (URO).\n'
          '• **Confidential Clinical Support** under Section 21 MHCA 2017.\n\n'
          'Your dialogue is 100% confidential and stigma-free. How may I assist you today?',
    }
  ];

  final List<String> _quickPrompts = [
    '72h Emergency Leave SLA Rules',
    'Mandatory 8h Rest Gap (SO-04)',
    'URO Shift Swap Eligibility',
    'Mental Health Stigma Protections',
    'Night Sentry Recovery Advice',
  ];

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
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

      if (mounted) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'text': res['reply'] ?? res['response'] ?? 'Request acknowledged under MHA defense welfare directives.',
          });
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'text':
                'Under MHA Directive SO-04 and Section 21 of the Mental Healthcare Act 2017, all trooper rest hours and emergency leave applications are strictly tracked with guaranteed SLAs. Please consult the Battalion Welfare Officer for urgent clinical intervention.',
          });
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
        _scrollToBottom();
      }
    }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF10B981).withValues(alpha: 0.2),
              ),
              child: const Icon(Icons.smart_toy_outlined, color: Color(0xFF10B981), size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PRAHARI SAHAYAK (AI COPILOT)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 1.1),
                ),
                Text(
                  'Bilingual Defense Welfare Intelligence (Section 21 MHCA 2017)',
                  style: TextStyle(fontSize: 10, color: Colors.white54),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Statutory Privacy Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF1E293B).withValues(alpha: 0.9),
            child: const Row(
              children: [
                Icon(Icons.lock_person_outlined, color: Color(0xFF10B981), size: 16),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Privileged Welfare Channel: Queries here never affect ACR or weapon status.',
                    style: TextStyle(color: Colors.white70, fontSize: 10),
                  ),
                ),
              ],
            ),
          ),

          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (ctx, index) {
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isUser ? const Color(0xFF047857) : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(16),
                        bottomLeft: !isUser ? const Radius.circular(0) : const Radius.circular(16),
                      ),
                      border: Border.all(
                        color: isUser ? const Color(0xFF10B981) : const Color(0xFF334155),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isUser ? Icons.person : Icons.shield,
                              size: 14,
                              color: isUser ? Colors.white70 : const Color(0xFF10B981),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              isUser ? 'YOU' : 'PRAHARI SAHAYAK',
                              style: TextStyle(
                                color: isUser ? Colors.white70 : const Color(0xFF10B981),
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          msg['text'] ?? '',
                          style: const TextStyle(color: Colors.white, fontSize: 12.5, height: 1.4),
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
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF10B981)),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Prahari Sahayak analyzing defense welfare database...',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 11),
                  ),
                ],
              ),
            ),

          // Quick Prompts Carousel
          Container(
            height: 38,
            margin: const EdgeInsets.only(bottom: 6),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _quickPrompts.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final p = _quickPrompts[i];
                return ActionChip(
                  label: Text(p, style: const TextStyle(color: Colors.white70, fontSize: 11)),
                  backgroundColor: const Color(0xFF1E293B),
                  side: const BorderSide(color: Color(0xFF334155)),
                  onPressed: () => _sendMessage(p),
                );
              },
            ),
          ),

          // Input Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(top: BorderSide(color: Color(0xFF1E293B), width: 1.5)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Ask about 72h leave, rest gap, or shift swaps...',
                      hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _sendMessage(_textController.text),
                  icon: const Icon(Icons.send, color: Color(0xFF10B981)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
