import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ux4g_flutter_components/ux4g_flutter_components.dart';
import 'providers/auth_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/stress_predictor_provider.dart';
import 'providers/theme_locale_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation_shell.dart';
import 'theme/ux4g_defense_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final authProvider = AuthProvider();
  await authProvider.init();

  final themeLocaleProvider = ThemeLocaleProvider();
  await themeLocaleProvider.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
        ChangeNotifierProvider.value(value: themeLocaleProvider),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => StressPredictorProvider()),
      ],
      child: const PrahariApp(),
    ),
  );
}

class PrahariApp extends StatelessWidget {
  const PrahariApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeLocale = context.watch<ThemeLocaleProvider>();

    return Ux4gTheme(
      isDark: themeLocale.isDark,
      child: MaterialApp(
        title: 'PRAHARI Bandhu — MHA/CRPF Personnel Welfare',
        debugShowCheckedModeBanner: false,
        theme: Ux4gDefenseTheme.buildTheme(
          isDark: themeLocale.isDark,
          fontScale: themeLocale.fontScale,
        ),
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeLocale = context.watch<ThemeLocaleProvider>();

    if (auth.isLoading) {
      return Scaffold(
        backgroundColor: themeLocale.isDark ? Ux4gDefenseTheme.bgDark : Ux4gDefenseTheme.bgLight,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: 36.0,
                width: 36.0,
                child: CircularProgressIndicator(
                  strokeWidth: 3.0,
                  valueColor: AlwaysStoppedAnimation<Color>(Ux4gDefenseTheme.mhaNavy),
                ),
              ),
              const SizedBox(height: 16.0),
              Text(
                'Verifying Session Security...',
                style: TextStyle(
                  color: themeLocale.isDark ? Colors.white70 : Ux4gDefenseTheme.mhaNavy,
                  fontSize: 13.0,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (auth.isAuthenticated) {
      return const MainNavigationShell();
    }

    return const LoginScreen();
  }
}
