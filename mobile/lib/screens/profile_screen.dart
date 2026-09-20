import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/secure_auth_store.dart';
import '../services/sync_queue.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/sos_dialog.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  void _showChangePinDialog() {
    final oldPinController = TextEditingController();
    final newPinController = TextEditingController();
    final confirmPinController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Security PIN', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: oldPinController,
              obscureText: true,
              keyboardType: TextInputType.text,
              decoration: const InputDecoration(labelText: 'Current PIN or Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newPinController,
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(labelText: 'New 4 or 6-digit PIN'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirmPinController,
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(labelText: 'Confirm New PIN'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final newPin = newPinController.text.trim();
              final confirmPin = confirmPinController.text.trim();
              if (newPin.isEmpty || newPin != confirmPin) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('New PINs do not match')),
                );
                return;
              }

              final auth = context.read<AuthProvider>();
              final sNum = auth.profile?.serviceNumber ?? auth.user?.serviceNumber ?? 'CRP-2019-45821';
              await SecureAuthStore().savePin(sNum, newPin);

              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    backgroundColor: Ux4gDefenseTheme.defenseGreen,
                    content: Text('Security PIN updated successfully on device.'),
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Ux4gDefenseTheme.mhaNavy),
            child: const Text('Save PIN', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showPrivacyExplanationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.privacy_tip_outlined, color: Ux4gDefenseTheme.mhaNavy),
            SizedBox(width: 8),
            Text('What This App Stores About Me', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '1. What IS stored:\n'
                '• Your service number, rank, and unit name.\n'
                '• Requests you explicitly submit (leave, grievances, family emergencies).\n'
                '• Voluntary wellbeing check-ins (kept strictly between you and your Welfare Officer).\n'
                '• Your local offline drafts and login PIN (encrypted on your device).\n\n'
                '2. What is NEVER stored or done:\n'
                '• No camera or microphone recordings without your tap.\n'
                '• No location or GPS tracking.\n'
                '• No surveillance scores or punitive marks on your record.\n'
                '• Check-ins are never shared with company commanders.\n\n'
                '3. Statutory Protection:\n'
                'Guaranteed under Section 21 of the Mental Healthcare Act 2017 and Digital Personal Data Protection Act 2023.',
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
            ],
          ),
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
    final syncQueue = context.watch<SyncQueue>();
    final themeLocale = context.watch<ThemeLocaleProvider>();
    final isDark = themeLocale.isDark;

    final soldierName = auth.profile?.name ?? auth.user?.name ?? 'Trooper';
    final serviceNo = auth.profile?.serviceNumber ?? auth.user?.serviceNumber ?? 'CRP-2019-45821';
    final rank = auth.profile?.rank ?? auth.user?.rank ?? 'Constable';
    final unit = auth.profile?.unitName ?? auth.user?.unitName ?? 'Alpha Company, 79 Bn CRPF';
    final lastSync = syncQueue.lastSyncTime != null
        ? DateFormat('hh:mm a, dd MMM').format(syncQueue.lastSyncTime!)
        : 'Just now';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Profile & Settings',
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
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          children: [
            // Trooper Identity Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Ux4gDefenseTheme.mhaNavy.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        soldierName.isNotEmpty ? soldierName[0].toUpperCase() : 'T',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Ux4gDefenseTheme.mhaNavy),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$rank $soldierName', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text('Service No: $serviceNo', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                        Text(unit, style: const TextStyle(fontSize: 12.5, color: Colors.grey)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // SECTION 1: LANGUAGE SWITCHER
            const Text(
              'APPLICATION LANGUAGE',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              ),
              child: RadioGroup<String>(
                groupValue: themeLocale.currentLocale,
                onChanged: (val) {
                  if (val != null) themeLocale.setLocale(val);
                },
                child: Column(
                  children: const [
                    RadioListTile<String>(
                      title: Text('English (Default)', style: TextStyle(fontSize: 14)),
                      value: 'en',
                    ),
                    Divider(height: 1),
                    RadioListTile<String>(
                      title: Text('हिंदी (Hindi)', style: TextStyle(fontSize: 14)),
                      value: 'hi',
                    ),
                    Divider(height: 1),
                    RadioListTile<String>(
                      title: Text('தமிழ் (Tamil)', style: TextStyle(fontSize: 14)),
                      value: 'ta',
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // SECTION 2: SECURITY & PRIVACY
            const Text(
              'SECURITY & PRIVACY',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.pin_outlined, color: Ux4gDefenseTheme.mhaNavy),
                    title: const Text('Change Security PIN', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Update device passcode for offline and fast entry', style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                    onTap: _showChangePinDialog,
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.security_outlined, color: Ux4gDefenseTheme.mhaNavy),
                    title: const Text('What this app stores about me', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Plain-language explanation of data handling & privacy', style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                    onTap: _showPrivacyExplanationDialog,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // SECTION 3: SYNC STATUS & CONTROLS
            const Text(
              'OFFLINE DATA SYNCHRONIZATION',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        syncQueue.isOffline ? Icons.cloud_off : Icons.cloud_done,
                        color: syncQueue.isOffline ? Colors.grey : Ux4gDefenseTheme.defenseGreen,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          syncQueue.statusMessage,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Pending uploads: ${syncQueue.pendingCount} • Last sync: $lastSync',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => syncQueue.flushQueue(),
                      icon: const Icon(Icons.sync_rounded, size: 18),
                      label: const Text('Sync Now With Server'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // LOGOUT BUTTON
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await auth.logout();
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.redAccent),
                  foregroundColor: Colors.redAccent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('Sign Out From Device', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),

            const SizedBox(height: 16),
            const Center(
              child: Text(
                'PRAHARI Bandhu Mobile • Release v2.4 (CAPF)',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
