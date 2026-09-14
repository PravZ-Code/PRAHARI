import 'package:flutter/material.dart';
import '../services/api_service.dart';

class PrahariVaniScreen extends StatefulWidget {
  const PrahariVaniScreen({super.key});

  @override
  State<PrahariVaniScreen> createState() => _PrahariVaniScreenState();
}

class _PrahariVaniScreenState extends State<PrahariVaniScreen> {
  final ApiService _apiService = ApiService();

  String _mode = 'ivr'; // 'ivr', 'ussd', 'sms'
  String _displayText = '1800-PRAHARI\nPress CALL to connect...';
  String _inputBuffer = '';
  bool _isInCall = false;
  String _callSessionId = 'call_001';
  bool _isLoading = false;

  void _onKeyPress(String key) {
    setState(() {
      if (_mode == 'ivr' && _isInCall) {
        // Touch-tone DTMF in active call
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
          _displayText = 'Connecting 1800-PRAHARI...\n\n[IVR MENU]\n1. Leave Status\n2. Fatigue Relief\n3. Welfare SOS\n4. Language Toggle';
          _inputBuffer = '';
        });
      }
    } else if (_mode == 'ussd') {
      if (_inputBuffer.isEmpty) {
        _inputBuffer = '*141#';
      }
      _sendUssd(_inputBuffer);
    } else if (_mode == 'sms') {
      if (_inputBuffer.isNotEmpty) {
        _sendSms(_inputBuffer);
      }
    }
  }

  void _onEndPress() {
    setState(() {
      _isInCall = false;
      _inputBuffer = '';
      if (_mode == 'ivr') {
        _displayText = 'CALL ENDED\n1800-PRAHARI\nPress CALL to reconnect';
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
      _displayText = 'DTMF tone [$digit] sent...\nProcessing voice prompt...';
    });

    try {
      final res = await _apiService.postIvrDTMF(
        callId: _callSessionId,
        digits: digit,
      );

      setState(() {
        _displayText = '[IVR AUDIO RESPONSE]\n\n${res["prompt_text"] ?? res["message"] ?? "Selection recorded."}\n\nPress 0 for Main Menu | END to hang up';
      });
    } catch (e) {
      setState(() {
        if (digit == '1') {
          _displayText = '[IVR]: Your domestic leave request is active. 71.4 hours remaining on 72h SLA timer.';
        } else if (digit == '2') {
          _displayText = '[IVR]: Fatigue alert logged. Recommended for URO sentry rotation. Mandatory 8h rest gap enforced.';
        } else if (digit == '3') {
          _displayText = '[IVR]: Urgent Welfare SOS triggered. Officer Meera notified under 4h response guarantee.';
        } else {
          _displayText = '[IVR]: Selection received. Press 1 for Leave, 2 for Fatigue, 3 for Welfare Counselor.';
        }
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _sendUssd(String code) async {
    setState(() {
      _isLoading = true;
      _displayText = 'Running USSD code $code...';
    });

    try {
      final res = await _apiService.postUSSD(
        sessionId: 'ussd_${DateTime.now().millisecondsSinceEpoch}',
        userInput: code,
      );

      setState(() {
        _displayText = '[GSM USSD PROMPT]\n\n${res["menu_text"] ?? res["message"] ?? "1. Sentry Status\n2. Report Fatigue\n3. Emergency SOS"}\n\nEnter number & press CALL';
        _inputBuffer = '';
      });
    } catch (e) {
      setState(() {
        _displayText = '[GSM USSD]\nPRAHARI TACTICAL BORDER GATEWAY\n1. Sentry Shift Check (Alpha Co)\n2. Log Fatigue Alert\n3. 72h Leave Status\n4. Emergency SOS\n\nPress digit & CALL';
        _inputBuffer = '';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _sendSms(String text) async {
    setState(() {
      _isLoading = true;
      _displayText = 'Transmitting SMS: "$text" to 56767...';
    });

    try {
      final res = await _apiService.postIncomingSMS(
        sender: '+919876543210',
        message: text,
      );

      setState(() {
        _displayText = '[INCOMING 2G SMS FROM 56767]\n\n${res["reply_text"] ?? res["message"] ?? "PRAHARI: Status active. Rest compliance 100%."}';
        _inputBuffer = '';
      });
    } catch (e) {
      setState(() {
        _displayText = '[INCOMING 2G SMS FROM 56767]\nPRAHARI ALERT: Your last sentry ended at 06:00. Mandatory 8h rest gap expires at 14:00. Leave request SLA: 71.2h left.';
        _inputBuffer = '';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'PRAHARI VANI (2G FEATURE PHONE)',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Zero-Internet 2G Keypad IVR / USSD / SMS Telecom Gateway',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Mode Toggle Row
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _ModeTab(
                        title: '1800 IVR',
                        isActive: _mode == 'ivr',
                        onTap: () => setState(() {
                          _mode = 'ivr';
                          _displayText = '1800-PRAHARI\nPress CALL to connect...';
                          _inputBuffer = '';
                          _isInCall = false;
                        }),
                      ),
                      _ModeTab(
                        title: '*141# USSD',
                        isActive: _mode == 'ussd',
                        onTap: () => setState(() {
                          _mode = 'ussd';
                          _displayText = 'GSM USSD TERMINAL\nDial *141# and press CALL';
                          _inputBuffer = '*141#';
                        }),
                      ),
                      _ModeTab(
                        title: '56767 SMS',
                        isActive: _mode == 'sms',
                        onTap: () => setState(() {
                          _mode = 'sms';
                          _displayText = 'SMS GATEWAY: 56767\nType STATUS or HELP & press SEND';
                          _inputBuffer = 'STATUS';
                        }),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 2G Phone Hardware Casing
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2E384D), Color(0xFF1B2333)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: const Color(0xFF475569), width: 2.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.6),
                        blurRadius: 20,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Speaker Grill
                      Container(
                        width: 50,
                        height: 5,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Retro Monochrome / Amber LCD Screen
                      Container(
                        height: 170,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF061A14), // Amber/Green phosphorescent tint
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF10B981).withOpacity(0.5), width: 2),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // LCD Top Status
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.signal_cellular_alt, color: Color(0xFF10B981), size: 12),
                                    SizedBox(width: 4),
                                    Text('2G CRPF', style: TextStyle(color: Color(0xFF10B981), fontSize: 9, fontFamily: 'monospace')),
                                  ],
                                ),
                                Text(
                                  _isInCall ? '[IN-CALL]' : 'STANDBY',
                                  style: const TextStyle(color: Color(0xFF10B981), fontSize: 9, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                                ),
                                const Icon(Icons.battery_full, color: Color(0xFF10B981), size: 14),
                              ],
                            ),
                            const Divider(color: Color(0xFF047857), height: 10),
                            Expanded(
                              child: SingleChildScrollView(
                                child: Text(
                                  _displayText,
                                  style: const TextStyle(
                                    color: Color(0xFF34D399),
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    height: 1.35,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            if (_isLoading)
                              const Align(
                                alignment: Alignment.bottomRight,
                                child: SizedBox(
                                  width: 12,
                                  height: 12,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF10B981)),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Action Keys (Call / End / Clear)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _TactileButton(
                            label: _mode == 'sms' ? 'SEND' : 'CALL',
                            color: const Color(0xFF10B981),
                            icon: _mode == 'sms' ? Icons.send : Icons.call,
                            onTap: _onCallPress,
                          ),
                          _TactileButton(
                            label: 'CLR',
                            color: const Color(0xFF64748B),
                            icon: Icons.backspace_outlined,
                            onTap: () {
                              setState(() {
                                if (_inputBuffer.isNotEmpty) {
                                  _inputBuffer = _inputBuffer.substring(0, _inputBuffer.length - 1);
                                  _displayText = _inputBuffer.isEmpty ? 'DIAL...' : _inputBuffer;
                                }
                              });
                            },
                          ),
                          _TactileButton(
                            label: 'END',
                            color: const Color(0xFFEF4444),
                            icon: Icons.call_end,
                            onTap: _onEndPress,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Keypad Matrix (1-9, *, 0, #)
                      _KeypadRow(
                        keys: const [
                          _KeyInfo('1', '.\n-'),
                          _KeyInfo('2', 'ABC'),
                          _KeyInfo('3', 'DEF'),
                        ],
                        onPress: _onKeyPress,
                      ),
                      const SizedBox(height: 8),
                      _KeypadRow(
                        keys: const [
                          _KeyInfo('4', 'GHI'),
                          _KeyInfo('5', 'JKL'),
                          _KeyInfo('6', 'MNO'),
                        ],
                        onPress: _onKeyPress,
                      ),
                      const SizedBox(height: 8),
                      _KeypadRow(
                        keys: const [
                          _KeyInfo('7', 'PQRS'),
                          _KeyInfo('8', 'TUV'),
                          _KeyInfo('9', 'WXYZ'),
                        ],
                        onPress: _onKeyPress,
                      ),
                      const SizedBox(height: 8),
                      _KeypadRow(
                        keys: const [
                          _KeyInfo('*', 'USSD'),
                          _KeyInfo('0', '+'),
                          _KeyInfo('#', 'MENU'),
                        ],
                        onPress: _onKeyPress,
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
}

class _ModeTab extends StatelessWidget {
  final String title;
  final bool isActive;
  final VoidCallback onTap;

  const _ModeTab({required this.title, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF10B981) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isActive ? Colors.white : Colors.white60,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _TactileButton extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  const _TactileButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 82,
        height: 44,
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color, width: 1.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w900),
            ),
          ],
        ),
      ),
    );
  }
}

class _KeyInfo {
  final String digit;
  final String sub;
  const _KeyInfo(this.digit, this.sub);
}

class _KeypadRow extends StatelessWidget {
  final List<_KeyInfo> keys;
  final ValueChanged<String> onPress;

  const _KeypadRow({required this.keys, required this.onPress});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: keys.map((k) {
        return InkWell(
          onTap: () => onPress(k.digit),
          borderRadius: BorderRadius.circular(10),
          child: Container(
            width: 82,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  k.digit,
                  style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900),
                ),
                Text(
                  k.sub,
                  style: const TextStyle(color: Colors.white38, fontSize: 8, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
