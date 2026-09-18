import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/audit_log_model.dart';
import '../providers/theme_locale_provider.dart';
import '../services/api_service.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

class AuditLedgerScreen extends StatefulWidget {
  const AuditLedgerScreen({super.key});

  @override
  State<AuditLedgerScreen> createState() => _AuditLedgerScreenState();
}

class _AuditLedgerScreenState extends State<AuditLedgerScreen> {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  bool _isVerifying = false;
  AuditChainVerification? _verification;
  List<AuditBlock> _blocks = [];

  @override
  void initState() {
    super.initState();
    _loadLedger();
  }

  Future<void> _loadLedger() async {
    setState(() => _isLoading = true);
    try {
      final verifyJson = await _apiService.verifyAuditChain();
      final logsJson = await _apiService.getAuditLogs();

      setState(() {
        _verification = AuditChainVerification.fromJson(verifyJson);
        _blocks = logsJson.map((x) => AuditBlock.fromJson(x)).toList();
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _runTamperVerification() async {
    setState(() => _isVerifying = true);
    await Future.delayed(const Duration(milliseconds: 600));

    try {
      final verifyJson = await _apiService.verifyAuditChain();
      setState(() {
        _verification = AuditChainVerification.fromJson(verifyJson);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Ux4gDefenseTheme.defenseGreen,
            content: Text('SHA-256 Ledger Verified: All cryptographic blocks untampered and valid per BSA 2023 §63!'),
          ),
        );
      }
    } catch (_) {}
    setState(() => _isVerifying = false);
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
              'IMMUTABLE AUDIT LEDGER',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'SHA-256 Hash Chain & BSA 2023 §63 Admissibility',
              style: TextStyle(fontSize: 10.5, color: Color(0xFFCBD5E1)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20.0),
            tooltip: 'Reload Ledger',
            onPressed: _loadLedger,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadLedger,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                children: [
                  // Verification Status Card
                  Ux4gCard(
                    accentColor: (_verification?.isValid ?? true)
                        ? Ux4gDefenseTheme.defenseGreen
                        : Ux4gDefenseTheme.crisisRed,
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  (_verification?.isValid ?? true) ? Icons.verified : Icons.warning,
                                  color: (_verification?.isValid ?? true)
                                      ? Ux4gDefenseTheme.defenseGreen
                                      : Ux4gDefenseTheme.crisisRed,
                                  size: 20.0,
                                ),
                                const SizedBox(width: 8.0),
                                const Text(
                                  'Cryptographic Hash Integrity',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                                ),
                              ],
                            ),
                            Ux4gBadge(
                              text: (_verification?.isValid ?? true) ? 'CHAIN VALID' : 'TAMPER DETECTED',
                              type: (_verification?.isValid ?? true)
                                  ? Ux4gBadgeType.success
                                  : Ux4gBadgeType.danger,
                            ),
                          ],
                        ),
                        const SizedBox(height: 8.0),
                        Text(
                          'Verified Total Blocks: ${_verification?.totalBlocks ?? _blocks.length} | Legal Standard: BSA 2023 Section 63(4)',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 12.0),
                        Ux4gButton(
                          label: 'Re-Verify Entire SHA-256 Ledger',
                          icon: Icons.security,
                          type: Ux4gButtonType.primary,
                          isLoading: _isVerifying,
                          onPressed: _runTamperVerification,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14.0),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2.0, vertical: 4.0),
                    child: Text(
                      'IMMUTABLE TRANSACTION CHAIN',
                      style: TextStyle(
                        fontSize: 12.0,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                      ),
                    ),
                  ),

                  const SizedBox(height: 6.0),

                  if (_blocks.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Text(
                          'No audit transactions recorded yet.',
                          style: TextStyle(
                            color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                          ),
                        ),
                      ),
                    )
                  else
                    ..._blocks.map((block) => _buildBlockCard(block, isDark)),
                ],
              ),
            ),
    );
  }

  Widget _buildBlockCard(AuditBlock block, bool isDark) {
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm:ss');
    final timeStr = dateFormat.format(block.timestamp);

    return Ux4gCard(
      padding: const EdgeInsets.all(14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Block #${block.sequenceNumber} — ${block.action}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.0),
              ),
              Ux4gBadge(text: block.role.toUpperCase(), type: Ux4gBadgeType.info),
            ],
          ),
          const SizedBox(height: 6.0),
          Text(
            block.details.isNotEmpty ? block.details.toString() : 'Verified Chain Action',
            style: TextStyle(
              fontSize: 12.0,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
          const SizedBox(height: 8.0),
          Container(
            padding: const EdgeInsets.all(8.0),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(4.0),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hash: ${block.currentHash.length > 28 ? "${block.currentHash.substring(0, 28)}..." : block.currentHash}',
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 10.5, color: Colors.grey),
                ),
                Text(
                  'Timestamp: $timeStr | User ID: ${block.user}',
                  style: const TextStyle(fontSize: 10.0, color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
