import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/api_service.dart';
import '../services/secure_auth_store.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/government_header_bar.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _serviceNoController = TextEditingController(text: 'rajesh_kumar');
  final _pinController = TextEditingController(text: 'demo123');
  bool _obscurePin = true;
  bool _backendOnline = false;

  @override
  void initState() {
    super.initState();
    _loadCachedServiceNumber();
    _checkBackendStatus();
  }

  Future<void> _loadCachedServiceNumber() async {
    final cached = await SecureAuthStore().getLastServiceNumber();
    if (cached != null && cached.isNotEmpty && mounted) {
      setState(() {
        _serviceNoController.text = cached;
      });
    }
  }

  @override
  void dispose() {
    _serviceNoController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _checkBackendStatus() async {
    if (!mounted) return;
    final healthy = await ApiService().checkHealth();
    if (mounted) {
      setState(() {
        _backendOnline = healthy;
      });
    }
  }

  void _handleLogin() async {
    final auth = context.read<AuthProvider>();
    final serviceNo = _serviceNoController.text.trim();
    final pin = _pinController.text.trim();

    if (serviceNo.isEmpty || pin.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your Service Number and 4-digit PIN')),
      );
      return;
    }

    final success = await auth.loginWithPin(serviceNo, pin);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF1E293B),
          content: Text(auth.errorMessage ?? 'Login failed. Verify credentials or contact your Welfare Officer.'),
        ),
      );
    }
  }

  void _showResetDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.contact_phone_outlined, color: Ux4gDefenseTheme.mhaNavy),
            SizedBox(width: 8),
            Text('PIN Reset Assistance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'For frontline operational security and privacy, PIN resets must be verified in person.\n\n'
              'Please speak with your Unit Welfare Officer or Battalion Welfare Havildar to reissue or reset your PIN.',
              style: TextStyle(fontSize: 14, height: 1.4),
            ),
            SizedBox(height: 12),
            Text(
              'National 24x7 Support: Tele-MANAS 14416',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Ux4gDefenseTheme.mhaNavy),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(backgroundColor: Ux4gDefenseTheme.mhaNavy),
            child: const Text('Understood', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    return Scaffold(
      appBar: const GovernmentHeaderBar(
        showControls: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8.0),

              // Title block
              Center(
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Ux4gDefenseTheme.mhaNavy.withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.shield_outlined,
                        size: 40,
                        color: Ux4gDefenseTheme.mhaNavy,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'PRAHARI BANDHU',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        color: isDark ? Colors.white : Ux4gDefenseTheme.mhaNavy,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Trooper Support & Welfare Desk',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24.0),

              // Connection status line
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _backendOnline ? Icons.cloud_done : Icons.cloud_off,
                      size: 16,
                      color: _backendOnline ? Ux4gDefenseTheme.defenseGreen : Colors.grey,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _backendOnline ? 'Network Connected' : 'Offline Ready (Cached login works)',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24.0),

              // Service Number input
              Text(
                'SERVICE NUMBER',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _serviceNoController,
                textCapitalization: TextCapitalization.characters,
                style: const TextStyle(fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Force username or service number',
                  prefixIcon: const Icon(Icons.badge_outlined, color: Ux4gDefenseTheme.mhaNavy),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),

              const SizedBox(height: 18.0),

              // PIN input
              Text(
                'SECURITY PIN',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _pinController,
                obscureText: _obscurePin,
                keyboardType: TextInputType.text,
                style: const TextStyle(fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Enter your 4-digit PIN or password',
                  prefixIcon: const Icon(Icons.lock_outline, color: Ux4gDefenseTheme.mhaNavy),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePin ? Icons.visibility_off : Icons.visibility,
                      color: Colors.grey,
                    ),
                    onPressed: () => setState(() => _obscurePin = !_obscurePin),
                  ),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),

              const SizedBox(height: 24.0),

              // Main Login Button
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: auth.isLoading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Ux4gDefenseTheme.mhaNavy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 1,
                  ),
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                        )
                      : const Text(
                          'ENTER APP',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                        ),
                ),
              ),

              const SizedBox(height: 16.0),

              // PIN Reset notice
              Center(
                child: TextButton(
                  onPressed: _showResetDialog,
                  child: Text(
                    'Forgot PIN? Contact your Welfare Officer',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? const Color(0xFF93C5FD) : Ux4gDefenseTheme.mhaNavy,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 12.0),

              // Quick demo access
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Demonstration Access (Jury / Field Evaluation):',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              _serviceNoController.text = 'CRPF-84012';
                              _pinController.text = 'demo123';
                              _handleLogin();
                            },
                            child: const Text('Trooper Rajesh', style: TextStyle(fontSize: 12)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              _serviceNoController.text = 'CRPF-91024';
                              _pinController.text = 'demo123';
                              _handleLogin();
                            },
                            child: const Text('Trooper Ankit', style: TextStyle(fontSize: 12)),
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
    );
  }
}
