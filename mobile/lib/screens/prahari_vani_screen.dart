import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

class PrahariVaniScreen extends StatefulWidget {
  const PrahariVaniScreen({super.key});

  @override
  State<PrahariVaniScreen> createState() => _PrahariVaniScreenState();
}

class _PrahariVaniScreenState extends State<PrahariVaniScreen> {
  final ApiService _apiService = ApiService();

  String _mode = 'ivr'; // 'ivr', 'ussd', 'sms'
  String _displayText = '1800-PRAHARI (Toll-Free)\nPress CALL to connect...';
  String _inputBuffer = '';
  bool _isInCall = false;
  String _callSessionId = 'call_001';
  bool _isLoading = false;

  void _onKeyPress(String key) {
    setState(() {
      if (_mode == 'ivr' && _isInCall) {
        _processIvrDigit(key);
      } else {
        _inputBuffer += key;
        _displayText = _inputBuffer;
      }
    });
  }

  void _onCallPress() async {
    if (_mode == 'ivr') {
      if (!_isInCall) {
        setState(() {
          _isInCall = true;
          _callSessionId = 'call_${DateTime.now().millisecondsSinceEpoch}';
          _displayText = 'Connecting to 1800-PRAHARI...\n\n[IVR MENU]\n1. Leave Status & SLA\n2. Circadian Fatigue Relief\n3. Emergency Welfare SOS\n4. Language: Hindi/Tamil';
          _inputBuffer = '';
        });
      }
    } else if (_mode == 'ussd') {
      if (_inputBuffer.isEmpty) _inputBuffer = '*141#';
      _sendUssd(_inputBuffer);
    } else if (_mode == 'sms') {
      if (_inputBuffer.isNotEmpty) _sendSms(_inputBuffer);
    }
  }

  void _onEndPress() {
    setState(() {
      _isInCall = false;
      _inputBuffer = '';
      if (_mode == 'ivr') {
        _displayText = 'CALL TERMINATED\n1800-PRAHARI\nPress CALL to reconnect';
      } else if (_mode == 'ussd') {
        _displayText = 'USSD SESSION TERMINATED\nDial *141# for menu';
      } else {
        _displayText = 'SMS GATEWAY: 56767\nType STATUS or HELP and press SEND';
      }
    });
  }

  void _processIvrDigit(String digit) async {
    setState(() {
      _isLoading = true;
      _displayText = 'DTMF Tone [$digit] transmitted...\nProcessing voice prompt...';
    });

    try {
      final res = await _apiService.postIvrDTMF(
        callId: _callSessionId,
        digits: digit,
      );

      setState(() {
        _isLoading = false;
        final prompt = res['prompt_text'] ?? res['response'] ?? 'Menu Option $digit Accepted.';
        _displayText = '[VOICE PROMPT]\n\n$prompt\n\nPress 0 for Main Menu | 9 for Operator';
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
        if (digit == '1') {
          _displayText = '[LEAVE STATUS]\nYour leave petition PRH-2026-004128 is UNDER REVIEW.\nSLA: 38h 14m remaining.\nPress 0 for Menu';
        } else if (digit == '2') {
          _displayText = '[FATIGUE RELIEF]\nLast rest: 9.5h compliant.\nNo active rest barrier violation.\nPress 0 for Menu';
        } else if (digit == '3') {
          _displayText = '[WELFARE SOS]\n12h Fast-Track SOS triggered for your unit.\nDuty officer alerted.\nPress 0 for Menu';
        } else {
          _displayText = '[IVR MENU]\n1. Leave Status\n2. Fatigue Relief\n3. Welfare SOS\n4. Language Toggle\nPress Digit (1-4):';
        }
      });
    }
  }

  void _sendUssd(String code) {
    setState(() {
      _displayText = 'Sending USSD $code...\n\nCRPF PRAHARI GATEWAY\n1. My Leave Docket\n2. Fatigue Status\n3. Emergency Help\nReply with number:';
      _inputBuffer = '';
    });
  }

  void _sendSms(String text) {
    setState(() {
      _displayText = 'SMS sent to 56767: "$text"\n\n[REPLY]: Request received and registered into PRAHARI tamper-evident audit ledger.';
      _inputBuffer = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'PRAHARI VANI HOTLINE',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'Feature Phone DTMF Keypad & USSD Simulator',
              style: TextStyle(fontSize: 10.5, color: Color(0xFFCBD5E1)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Gateway Mode Selector
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'ivr', label: Text('IVR (1800)', style: TextStyle(fontSize: 11.5))),
                    ButtonSegment(value: 'ussd', label: Text('USSD (*141#)', style: TextStyle(fontSize: 11.5))),
                    ButtonSegment(value: 'sms', label: Text('SMS (56767)', style: TextStyle(fontSize: 11.5))),
                  ],
                  selected: {_mode},
                  onSelectionChanged: (set) {
                    setState(() {
                      _mode = set.first;
                      _onEndPress();
                    });
                  },
                ),

                const SizedBox(height: 14.0),

                // Tactical Telephone LCD Screen
                Container(
                  height: 140.0,
                  padding: const EdgeInsets.all(14.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F2027),
                    borderRadius: BorderRadius.circular(8.0),
                    border: Border.all(color: const Color(0xFF203A43), width: 2.0),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _mode.toUpperCase(),
                            style: const TextStyle(
                              color: Color(0xFF48CAE4),
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                            ),
                          ),
                          Row(
                            children: [
                              if (_isLoading)
                                const Padding(
                                  padding: EdgeInsets.only(right: 8.0),
                                  child: SizedBox(
                                    width: 10.0,
                                    height: 10.0,
                                    child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF48CAE4)),
                                  ),
                                ),
                              if (_isInCall)
                                const Row(
                                  children: [
                                    Icon(Icons.fiber_manual_record, size: 10.0, color: Colors.red),
                                    SizedBox(width: 4.0),
                                    Text('LIVE CALL', style: TextStyle(color: Colors.red, fontSize: 10.0, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8.0),
                      Expanded(
                        child: Text(
                          _displayText,
                          style: const TextStyle(
                            color: Color(0xFF90E0EF),
                            fontSize: 12.0,
                            fontFamily: 'monospace',
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16.0),

                // 12-Key Tactical Dialpad
                Ux4gCard(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      _buildDialpadRow(['1', '2', '3'], [' ', 'ABC', 'DEF']),
                      const SizedBox(height: 10.0),
                      _buildDialpadRow(['4', '5', '6'], ['GHI', 'JKL', 'MNO']),
                      const SizedBox(height: 10.0),
                      _buildDialpadRow(['7', '8', '9'], ['PQRS', 'TUV', 'WXYZ']),
                      const SizedBox(height: 10.0),
                      _buildDialpadRow(['*', '0', '#'], [' ', '+', ' ']),
                      const SizedBox(height: 16.0),

                      // Call & End Buttons
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Ux4gDefenseTheme.defenseGreen,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12.0),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6.0)),
                              ),
                              icon: const Icon(Icons.call, size: 18.0),
                              label: const Text('CALL', style: TextStyle(fontWeight: FontWeight.bold)),
                              onPressed: _onCallPress,
                            ),
                          ),
                          const SizedBox(width: 12.0),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Ux4gDefenseTheme.crisisRed,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12.0),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6.0)),
                              ),
                              icon: const Icon(Icons.call_end, size: 18.0),
                              label: const Text('END', style: TextStyle(fontWeight: FontWeight.bold)),
                              onPressed: _onEndPress,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDialpadRow(List<String> keys, List<String> subtexts) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(3, (idx) {
        return SizedBox(
          width: 76.0,
          height: 52.0,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.zero,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6.0)),
            ),
            onPressed: () => _onKeyPress(keys[idx]),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  keys[idx],
                  style: const TextStyle(fontSize: 18.0, fontWeight: FontWeight.bold),
                ),
                Text(
                  subtexts[idx],
                  style: const TextStyle(fontSize: 8.5, color: Colors.grey),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }
}
