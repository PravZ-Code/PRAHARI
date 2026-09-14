import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../models/user_model.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isEditing = false;
  bool _isSaving = false;

  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _rankController;
  late TextEditingController _tradeController;
  late TextEditingController _companyController;
  late TextEditingController _contactController;
  late TextEditingController _hardAreaController;
  late TextEditingController _transfersController;

  final List<String> _rankOptions = [
    'Constable',
    'Head Constable',
    'Assistant Sub-Inspector (ASI)',
    'Sub-Inspector (SI)',
    'Inspector',
    'Subedar Major',
  ];

  final List<String> _tradeOptions = [
    'GD (General Duty)',
    'Armorer',
    'Driver / MT',
    'Radio Operator (RO)',
    'Bugler',
    'Nursing Assistant',
  ];

  @override
  void initState() {
    super.initState();
    _initControllers();
  }

  void _initControllers() {
    final auth = context.read<AuthProvider>();
    final prof = auth.profile;
    final user = auth.user;

    _nameController = TextEditingController(text: prof?.name ?? user?.name ?? '');
    _rankController = TextEditingController(text: prof?.rank ?? user?.rank ?? 'Constable');
    _tradeController = TextEditingController(text: prof?.trade ?? 'GD');
    _companyController = TextEditingController(text: prof?.company ?? 'Alpha Company');
    _contactController = TextEditingController(text: prof?.contactNumber ?? '');
    _hardAreaController = TextEditingController(text: '${prof?.hardAreaMonths ?? 0}');
    _transfersController = TextEditingController(text: '${prof?.totalTransfers ?? 0}');
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

  void _syncFromProfile(PersonnelProfile? prof) {
    if (prof != null && !_isEditing) {
      if (_nameController.text.isEmpty) _nameController.text = prof.name;
      if (_rankController.text.isEmpty) _rankController.text = prof.rank;
      if (_tradeController.text.isEmpty) _tradeController.text = prof.trade;
      if (_companyController.text.isEmpty) _companyController.text = prof.company;
      if (_contactController.text.isEmpty) _contactController.text = prof.contactNumber;
      _hardAreaController.text = '${prof.hardAreaMonths}';
      _transfersController.text = '${prof.totalTransfers}';
    }
  }

  void _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final auth = context.read<AuthProvider>();

    final updateData = {
      'name': _nameController.text.trim(),
      'rank': _rankController.text.trim(),
      'trade': _tradeController.text.trim().replaceAll(RegExp(r'\s*\(.*\)'), ''),
      'company': _companyController.text.trim(),
      'contact_number': _contactController.text.trim(),
      'hard_area_months': int.tryParse(_hardAreaController.text.trim()) ?? 0,
      'total_transfers': int.tryParse(_transfersController.text.trim()) ?? 0,
    };

    final success = await auth.updateProfile(updateData);
    setState(() {
      _isSaving = false;
      if (success) _isEditing = false;
    });

    if (mounted) {
      if (success) {
        // Also refresh dashboard provider to pick up updated name/rank
        context.read<DashboardProvider>().loadDashboard();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('Personnel profile updated and synchronized with battalion database!'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFEF4444),
            content: Text(auth.errorMessage ?? 'Failed to update profile'),
          ),
        );
      }
    }
  }

  void _handleLogout() async {
    context.read<DashboardProvider>().resetState();
    await context.read<AuthProvider>().logout();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final prof = auth.profile;
    final user = auth.user;

    _syncFromProfile(prof);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'MY DETAILS & PROFILE',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2),
            ),
            Text(
              'Paramilitary Personnel Identity Record',
              style: TextStyle(fontSize: 10, color: Colors.white54),
            ),
          ],
        ),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: const Icon(Icons.edit, color: Color(0xFF10B981)),
              tooltip: 'Edit Profile',
              onPressed: () => setState(() => _isEditing = true),
            )
          else
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white70),
              tooltip: 'Cancel Edit',
              onPressed: () {
                setState(() {
                  _isEditing = false;
                  _initControllers();
                });
              },
            ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFFEF4444)),
            tooltip: 'Logout Session',
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: auth.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Service Identification Card
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF064E3B), Color(0xFF0F172A)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF10B981).withValues(alpha: 0.2),
                            border: Border.all(color: const Color(0xFF10B981), width: 1.5),
                          ),
                          child: const Icon(Icons.person, color: Color(0xFF10B981), size: 30),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                (prof?.name ?? user?.name ?? 'Trooper').toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.0,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${prof?.rank ?? user?.rank ?? 'Constable'} • ${prof?.trade ?? 'GD'}',
                                style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'SERVICE ID: ${prof?.serviceNumber ?? user?.serviceNumber ?? 'CRPF-PENDING'}',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Privacy Assurance Note (Section 21 MHCA 2017)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.lock_outline, color: Color(0xFF10B981), size: 18),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Statutory Privacy Notice: Under Section 21 MHCA 2017, personal welfare details are confidential and never accessible for disciplinary or promotion penalization.',
                            style: TextStyle(color: Colors.white70, fontSize: 10.5, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  const Text(
                    'SERVICE & FORMATION DETAILS',
                    style: TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Name Field
                  _buildTextField(
                    label: 'Full Name',
                    controller: _nameController,
                    icon: Icons.badge_outlined,
                    enabled: _isEditing,
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Name cannot be blank' : null,
                  ),
                  const SizedBox(height: 12),

                  // Rank Field
                  if (_isEditing)
                    _buildDropdownField(
                      label: 'Rank',
                      currentValue: _rankOptions.firstWhere(
                        (r) => r.toLowerCase().contains(_rankController.text.toLowerCase()),
                        orElse: () => _rankOptions.first,
                      ),
                      items: _rankOptions,
                      icon: Icons.military_tech_outlined,
                      onChanged: (val) {
                        if (val != null) {
                          _rankController.text = val;
                        }
                      },
                    )
                  else
                    _buildTextField(
                      label: 'Rank',
                      controller: _rankController,
                      icon: Icons.military_tech_outlined,
                      enabled: false,
                    ),
                  const SizedBox(height: 12),

                  // Trade Field
                  if (_isEditing)
                    _buildDropdownField(
                      label: 'Trade / Role',
                      currentValue: _tradeOptions.firstWhere(
                        (t) => t.toLowerCase().contains(_tradeController.text.toLowerCase()),
                        orElse: () => _tradeOptions.first,
                      ),
                      items: _tradeOptions,
                      icon: Icons.handyman_outlined,
                      onChanged: (val) {
                        if (val != null) {
                          _tradeController.text = val;
                        }
                      },
                    )
                  else
                    _buildTextField(
                      label: 'Trade / Role',
                      controller: _tradeController,
                      icon: Icons.handyman_outlined,
                      enabled: false,
                    ),
                  const SizedBox(height: 12),

                  // Company / Sub-Unit
                  _buildTextField(
                    label: 'Company / Tactical Sub-Unit',
                    controller: _companyController,
                    icon: Icons.business_outlined,
                    enabled: _isEditing,
                  ),
                  const SizedBox(height: 12),

                  // Contact Number
                  _buildTextField(
                    label: 'Contact Phone Number',
                    controller: _contactController,
                    icon: Icons.phone_outlined,
                    enabled: _isEditing,
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 12),

                  // Unit & Formation (System Assigned)
                  _buildReadOnlyTile(
                    title: 'Battalion / Formation',
                    value: prof?.unitName ?? user?.unitName ?? 'Battalion HQ',
                    subtitle: prof?.formation ?? 'Paramilitary Operational Force',
                    icon: Icons.flag_outlined,
                  ),
                  const SizedBox(height: 8),

                  _buildReadOnlyTile(
                    title: 'Operational Terrain Zone',
                    value: (prof?.operationalArea ?? 'General Area').toUpperCase(),
                    subtitle: 'Determines rest rotation frequency & risk weighting',
                    icon: Icons.terrain_outlined,
                  ),

                  const SizedBox(height: 20),
                  const Text(
                    'OPERATIONAL EXPERIENCE & ROTATION',
                    style: TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          label: 'Hard Area Months',
                          controller: _hardAreaController,
                          icon: Icons.timer_outlined,
                          enabled: _isEditing,
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildTextField(
                          label: 'Total Transfers',
                          controller: _transfersController,
                          icon: Icons.sync_alt,
                          enabled: _isEditing,
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (prof?.dateOfJoining != null && prof!.dateOfJoining.isNotEmpty)
                    _buildReadOnlyTile(
                      title: 'Date of Joining Service',
                      value: prof.dateOfJoining,
                      icon: Icons.calendar_today_outlined,
                    ),

                  const SizedBox(height: 24),

                  // Action Buttons
                  if (_isEditing)
                    ElevatedButton(
                      onPressed: _isSaving ? null : _handleSave,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'SAVE PROFILE CHANGES',
                              style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.0),
                            ),
                    )
                  else
                    OutlinedButton.icon(
                      onPressed: () => setState(() => _isEditing = true),
                      icon: const Icon(Icons.edit, size: 16),
                      label: const Text('UPDATE MY DETAILS'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF10B981),
                        side: const BorderSide(color: Color(0xFF10B981)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),

                  const SizedBox(height: 16),

                  // Logout Button
                  OutlinedButton.icon(
                    onPressed: _handleLogout,
                    icon: const Icon(Icons.logout, size: 16, color: Color(0xFFEF4444)),
                    label: const Text('LOGOUT / SWITCH PERSONNEL', style: TextStyle(color: Color(0xFFEF4444))),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFEF4444)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    bool enabled = true,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      keyboardType: keyboardType,
      validator: validator,
      style: TextStyle(color: enabled ? Colors.white : Colors.white70),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white60, fontSize: 13),
        prefixIcon: Icon(icon, color: enabled ? const Color(0xFF10B981) : Colors.white38, size: 20),
        filled: true,
        fillColor: enabled ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF10B981)),
        ),
      ),
    );
  }

  Widget _buildDropdownField({
    required String label,
    required String currentValue,
    required List<String> items,
    required IconData icon,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      initialValue: currentValue,
      dropdownColor: const Color(0xFF1E293B),
      style: const TextStyle(color: Colors.white, fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white60, fontSize: 13),
        prefixIcon: Icon(icon, color: const Color(0xFF10B981), size: 20),
        filled: true,
        fillColor: const Color(0xFF1E293B),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF10B981)),
        ),
      ),
      items: items.map((val) => DropdownMenuItem(value: val, child: Text(val))).toList(),
      onChanged: onChanged,
    );
  }

  Widget _buildReadOnlyTile({
    required String title,
    required String value,
    String? subtitle,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white38, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white54, fontSize: 11)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 10)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
