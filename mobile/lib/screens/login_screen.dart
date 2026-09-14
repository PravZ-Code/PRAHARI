import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/api_service.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/government_header_bar.dart';
import '../widgets/ux4g_widgets.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(text: 'rajesh_kumar');
  final _passwordController = TextEditingController(text: 'demo123');
  bool _obscurePassword = true;
  bool _backendOnline = false;
  bool _checkingHealth = false;

  @override
  void initState() {
    super.initState();
    _checkBackendStatus();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _checkBackendStatus() async {
    if (!mounted) return;
    setState(() => _checkingHealth = true);
    final healthy = await ApiService().checkHealth();
    if (mounted) {
      setState(() {
        _backendOnline = healthy;
        _checkingHealth = false;
      });
    }
  }

  void _handleLogin() async {
    final auth = context.read<AuthProvider>();
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter both service username and password')),
      );
      return;
    }

    final success = await auth.login(username, password);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Ux4gDefenseTheme.crisisRed,
          content: Text(auth.errorMessage ?? 'Authentication failed. Please verify credentials.'),
        ),
      );
    }
  }

  void _handleQuickLogin(String personnelKey) async {
    final auth = context.read<AuthProvider>();
    if (personnelKey == 'A') {
      _usernameController.text = 'rajesh_kumar';
      _passwordController.text = 'demo123';
    } else {
      _usernameController.text = 'ankit_sharma';
      _passwordController.text = 'demo123';
    }
    final success = await auth.loginPersonnelDemo(personnelKey);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Ux4gDefenseTheme.crisisRed,
          content: Text(auth.errorMessage ?? 'Demo authentication failed'),
        ),
      );
    }
  }

  void _showServerConfigDialog() {
    final apiService = ApiService();
    final controller = TextEditingController(text: apiService.baseUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Configure Backend API Endpoint'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter the FastAPI server URL (e.g. http://10.0.2.2:8000/api for Android emulator, or LAN IP for physical device):',
              style: TextStyle(fontSize: 12.5),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Base URL',
                hintText: 'http://localhost:8000/api',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              await apiService.setCustomBaseUrl(controller.text);
              if (mounted) {
                Navigator.pop(ctx);
                _checkBackendStatus();
              }
            },
            child: const Text('Save & Test'),
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
      appBar: const GovernmentHeaderBar(showControls: true),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Government Security Notice
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(
                        color: isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.security, size: 18.0, color: isDark ? Colors.white70 : Ux4gDefenseTheme.mhaNavy),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: Text(
                            themeLocale.tr('restricted_notice'),
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                              color: isDark ? const Color(0xFFCBD5E1) : Ux4gDefenseTheme.textSecondaryLight,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20.0),

                  // Official Login Card
                  Ux4gCard(
                    accentColor: Ux4gDefenseTheme.mhaNavy,
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6.0),
                              child: Image.asset(
                                'assets/images/prahari_logo.png',
                                height: 44.0,
                                width: 44.0,
                                errorBuilder: (ctx, err, stack) => const Icon(Icons.shield, size: 40.0, color: Ux4gDefenseTheme.mhaNavy),
                              ),
                            ),
                            const SizedBox(width: 14.0),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'PRAHARI Bandhu',
                                    style: TextStyle(
                                      fontSize: 18.0,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : Ux4gDefenseTheme.mhaNavy,
                                    ),
                                  ),
                                  const SizedBox(height: 2.0),
                                  Text(
                                    'Tactical Welfare & Leave Management',
                                    style: TextStyle(
                                      fontSize: 12.0,
                                      color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 20.0),
                        const Divider(),
                        const SizedBox(height: 18.0),

                        // Username Field
                        TextField(
                          controller: _usernameController,
                          decoration: const InputDecoration(
                            labelText: 'Trooper Username / Service ID',
                            prefixIcon: Icon(Icons.badge_outlined, size: 20.0),
                          ),
                        ),

                        const SizedBox(height: 14.0),

                        // Password Field
                        TextField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            labelText: 'Security PIN / Password',
                            prefixIcon: const Icon(Icons.lock_outline, size: 20.0),
                            suffixIcon: IconButton(
                              icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20.0),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                        ),

                        const SizedBox(height: 20.0),

                        // Sign In Action Button
                        Ux4gButton(
                          label: themeLocale.tr('login'),
                          icon: Icons.login,
                          isLoading: auth.isLoading,
                          onPressed: _handleLogin,
                        ),

                        const SizedBox(height: 16.0),

                        // Quick Test Credentials
                        Text(
                          'Select Authorized Test Account:',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 8.0),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4.0)),
                                ),
                                icon: const Icon(Icons.person, size: 16.0),
                                label: const Text('Rajesh Kumar (GD-10492)', style: TextStyle(fontSize: 11.0)),
                                onPressed: auth.isLoading ? null : () => _handleQuickLogin('A'),
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            Expanded(
                              child: OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4.0)),
                                ),
                                icon: const Icon(Icons.person_outline, size: 16.0),
                                label: const Text('Ankit Sharma (GD-10518)', style: TextStyle(fontSize: 11.0)),
                                onPressed: auth.isLoading ? null : () => _handleQuickLogin('B'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // Backend Connectivity & Configuration Bar
                  InkWell(
                    onTap: _showServerConfigDialog,
                    borderRadius: BorderRadius.circular(6.0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                      decoration: BoxDecoration(
                        color: isDark ? Ux4gDefenseTheme.surfaceDark : Colors.white,
                        borderRadius: BorderRadius.circular(6.0),
                        border: Border.all(
                          color: isDark ? Ux4gDefenseTheme.borderDark : Ux4gDefenseTheme.borderLight,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.dns_outlined,
                            size: 16.0,
                            color: isDark ? Colors.white70 : Ux4gDefenseTheme.mhaNavy,
                          ),
                          const SizedBox(width: 8.0),
                          Expanded(
                            child: Text(
                              'Server: ${ApiService().baseUrl}',
                              style: TextStyle(
                                fontSize: 11.0,
                                color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8.0),
                          if (_checkingHealth)
                            const SizedBox(
                              width: 14.0,
                              height: 14.0,
                              child: CircularProgressIndicator(strokeWidth: 2.0),
                            )
                          else
                            Ux4gBadge(
                              text: _backendOnline ? 'CONNECTED' : 'DISCONNECTED',
                              type: _backendOnline ? Ux4gBadgeType.success : Ux4gBadgeType.danger,
                              icon: _backendOnline ? Icons.check_circle : Icons.error_outline,
                            ),
                          const SizedBox(width: 6.0),
                          const Icon(Icons.settings, size: 14.0),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24.0),

                  // Tele-MANAS Statutory Helpline Footer
                  Container(
                    padding: const EdgeInsets.all(12.0),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6.0),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.support_agent, color: Color(0xFF1D4ED8), size: 24.0),
                        SizedBox(width: 10.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'National Tele-MANAS 24x7 Helpline',
                                style: TextStyle(
                                  color: Color(0xFF1E3A8A),
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 2.0),
                              Text(
                                'Dial 14416 or 1800-891-4416 (Statutory Confidential Care)',
                                style: TextStyle(
                                  color: Color(0xFF1D4ED8),
                                  fontSize: 11.0,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
