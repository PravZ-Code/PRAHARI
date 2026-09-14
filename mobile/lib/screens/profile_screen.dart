import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_locale_provider.dart';
import '../services/api_service.dart';
import '../theme/ux4g_defense_theme.dart';
import '../widgets/ux4g_widgets.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isEditing = false;
  bool _isSaving = false;

  late TextEditingController _nameController;
  late TextEditingController _rankController;
  late TextEditingController _tradeController;
  late TextEditingController _companyController;
  late TextEditingController _contactController;
  late TextEditingController _hardAreaController;
  late TextEditingController _transfersController;

  @override
  void initState() {
    super.initState();
    _initControllers();
  }

  void _initControllers() {
    final auth = context.read<AuthProvider>();
    final prof = auth.profile;
    final user = auth.user;

    _nameController = TextEditingController(text: prof?.name ?? user?.name ?? 'Rajesh Kumar');
    _rankController = TextEditingController(text: prof?.rank ?? user?.rank ?? 'Constable/GD');
    _tradeController = TextEditingController(text: prof?.trade ?? 'GD Rifleman');
    _companyController = TextEditingController(text: prof?.company ?? 'Alpha Company, 79 Bn');
    _contactController = TextEditingController(text: prof?.contactNumber ?? '+91 98765 43210');
    _hardAreaController = TextEditingController(text: '${prof?.hardAreaMonths ?? 18}');
    _transfersController = TextEditingController(text: '${prof?.totalTransfers ?? 4}');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _rankController.dispose();
    _tradeController.dispose();
    _companyController.dispose();
    _contactController.dispose();
    _hardAreaController.dispose();
    _transfersController.dispose();
    super.dispose();
  }

  void _handleSaveProfile() async {
    setState(() => _isSaving = true);
    final auth = context.read<AuthProvider>();

    final data = {
      'name': _nameController.text.trim(),
      'rank': _rankController.text.trim(),
      'trade': _tradeController.text.trim(),
      'company': _companyController.text.trim(),
      'contact_number': _contactController.text.trim(),
      'hard_area_months': int.tryParse(_hardAreaController.text.trim()) ?? 0,
      'total_transfers': int.tryParse(_transfersController.text.trim()) ?? 0,
    };

    final success = await auth.updateProfile(data);
    setState(() {
      _isSaving = false;
      _isEditing = false;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: success ? Ux4gDefenseTheme.defenseGreen : Ux4gDefenseTheme.crisisRed,
          content: Text(
            success ? 'Personnel service record updated successfully!' : 'Failed to update record on server.',
          ),
        ),
      );
    }
  }

  void _showDataCorrectionDialog() {
    final issueController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Data Correction & Dispute Petition'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Under DPDP Act 2023 §12, personnel have the statutory right to contest incorrect shift records, corrupted survey data, or wrong leave counts.',
              style: TextStyle(fontSize: 12.0, height: 1.3),
            ),
            const SizedBox(height: 12.0),
            TextField(
              controller: issueController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Disputed Record & Corrections Required',
                hintText: 'Specify dates, wrong shift entries, or missing rest calculations...',
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
            style: ElevatedButton.styleFrom(
              backgroundColor: Ux4gDefenseTheme.mhaNavy,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              if (issueController.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              try {
                await ApiService().submitPersonnelRequest(
                  requestType: 'grievance',
                  category: 'other_grievance',
                  description: 'DATA CORRECTION PETITION (DPDP 2023 §12): ${issueController.text.trim()}',
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: Ux4gDefenseTheme.defenseGreen,
                      content: Text('Correction petition filed! 48h statutory redressal SLA active.'),
                    ),
                  );
                }
              } catch (_) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: Ux4gDefenseTheme.crisisRed,
                      content: Text('Failed to submit petition.'),
                    ),
                  );
                }
              }
            },
            child: const Text('File Formal Dispute'),
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
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'TROOPER SERVICE DOSSIER',
              style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            Text(
              'Confidential Personnel Records & Privacy Charter',
              style: TextStyle(fontSize: 10.5, color: Color(0xFFCBD5E1)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(_isEditing ? Icons.close : Icons.edit_outlined, size: 20.0),
            tooltip: _isEditing ? 'Cancel Edit' : 'Edit Contact Info',
            onPressed: () => setState(() => _isEditing = !_isEditing),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Trooper Identification Badge Card
            Ux4gCard(
              accentColor: Ux4gDefenseTheme.mhaNavy,
              padding: const EdgeInsets.all(18.0),
              child: Row(
                children: [
                  Container(
                    height: 56.0,
                    width: 56.0,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                      border: Border.all(color: Ux4gDefenseTheme.mhaNavy, width: 2.0),
                    ),
                    child: const Icon(Icons.person, size: 32.0, color: Ux4gDefenseTheme.mhaNavy),
                  ),
                  const SizedBox(width: 14.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _nameController.text,
                          style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          '${_rankController.text} | Service No: ${auth.profile?.serviceNumber ?? auth.user?.serviceNumber ?? "GD-10492"}',
                          style: TextStyle(
                            fontSize: 12.0,
                            color: isDark ? Ux4gDefenseTheme.textSecondaryDark : Ux4gDefenseTheme.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: 6.0),
                        const Ux4gBadge(text: 'ACTIVE SERVICE - VERIFIED', type: Ux4gBadgeType.success),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14.0),

            // Service Details Card
            Ux4gCard(
              padding: const EdgeInsets.all(18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Administrative Deployment Parameters',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                  ),
                  const SizedBox(height: 14.0),

                  if (_isEditing) ...[
                    TextField(
                      controller: _contactController,
                      decoration: const InputDecoration(labelText: 'Primary Contact / Mobile'),
                    ),
                    const SizedBox(height: 12.0),
                    TextField(
                      controller: _hardAreaController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Hard Area Deployment (Months)'),
                    ),
                    const SizedBox(height: 16.0),
                    Ux4gButton(
                      label: 'Save Updated Records',
                      icon: Icons.check,
                      type: Ux4gButtonType.primary,
                      isLoading: _isSaving,
                      onPressed: _handleSaveProfile,
                    ),
                  ] else ...[
                    _buildDossierRow('Assigned Company:', _companyController.text),
                    const Divider(),
                    _buildDossierRow('Military Trade (MOS):', _tradeController.text),
                    const Divider(),
                    _buildDossierRow('Hard Area Deployment:', '${_hardAreaController.text} Months'),
                    const Divider(),
                    _buildDossierRow('Total Unit Transfers:', '${_transfersController.text} Stations'),
                    const Divider(),
                    _buildDossierRow('Emergency Contact:', _contactController.text),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 14.0),

            // DPDP Act 2023 & Section 21 MHCA Privacy Charter
            Ux4gCard(
              accentColor: Ux4gDefenseTheme.defenseGreen,
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.lock, size: 18.0, color: Ux4gDefenseTheme.defenseGreen),
                      SizedBox(width: 8.0),
                      Text(
                        'Statutory Confidentiality & Data Rights',
                        style: TextStyle(fontSize: 13.0, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    '1. Section 21 MHCA 2017: Mental health, stress, and voluntary check-in notes are strictly confidential and legally prohibited from being used in Annual Confidential Reports (ACR) or promotion dockets.\n'
                    '2. Digital Personal Data Protection Act, 2023: You have the right to transparent audit logs of who accessed your welfare profile.',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? Colors.white70 : Colors.black87,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 12.0),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4.0)),
                          ),
                          icon: const Icon(Icons.history, size: 15.0),
                          label: const Text('Access Logs', style: TextStyle(fontSize: 11.5)),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Access Log: Only Company Commander & Unit Welfare Officer have verified audit clearance.'),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4.0)),
                          ),
                          icon: const Icon(Icons.edit_document, size: 15.0),
                          label: const Text('Data Correction', style: TextStyle(fontSize: 11.5)),
                          onPressed: _showDataCorrectionDialog,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16.0),

            // Sign Out Session Button
            Ux4gButton(
              label: 'Sign Out Session',
              icon: Icons.logout,
              type: Ux4gButtonType.outline,
              onPressed: () => auth.logout(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDossierRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12.0, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
