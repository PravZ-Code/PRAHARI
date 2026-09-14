import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages UX4G Theme Mode, Font Scaling, and GIGW 3.0 Trilingual Localization (EN, HI, TA)
class ThemeLocaleProvider extends ChangeNotifier {
  bool _isDark = false;
  bool _isHighContrast = false;
  double _fontScale = 1.0;
  String _currentLocale = 'en'; // 'en', 'hi', 'ta'

  bool get isDark => _isDark;
  bool get isHighContrast => _isHighContrast;
  double get fontScale => _fontScale;
  String get currentLocale => _currentLocale;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _isDark = prefs.getBool('ux4g_is_dark') ?? false;
    _isHighContrast = prefs.getBool('ux4g_high_contrast') ?? false;
    _fontScale = prefs.getDouble('ux4g_font_scale') ?? 1.0;
    _currentLocale = prefs.getString('ux4g_locale') ?? 'en';
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    _isDark = !_isDark;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('ux4g_is_dark', _isDark);
    notifyListeners();
  }

  Future<void> toggleHighContrast() async {
    _isHighContrast = !_isHighContrast;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('ux4g_high_contrast', _isHighContrast);
    notifyListeners();
  }

  Future<void> setFontScale(double scale) async {
    _fontScale = scale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('ux4g_font_scale', _fontScale);
    notifyListeners();
  }

  Future<void> setLocale(String langCode) async {
    if (langCode == _currentLocale) return;
    _currentLocale = langCode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('ux4g_locale', _currentLocale);
    notifyListeners();
  }

  // --- Trilingual String Dictionary (GIGW 3.0 Multilingual Guidelines) ---
  static final Map<String, Map<String, String>> _strings = {
    'app_title': {
      'en': 'PRAHARI Bandhu',
      'hi': 'प्रहरी बंधु',
      'ta': 'பிரகாரி பந்து',
    },
    'mha_header': {
      'en': 'Ministry of Home Affairs',
      'hi': 'गृह मंत्रालय',
      'ta': 'மத்திய உள்துறை அமைச்சகம்',
    },
    'crpf_header': {
      'en': 'Central Reserve Police Force',
      'hi': 'केंद्रीय रिजर्व पुलिस बल',
      'ta': 'மத்திய ரிசர்வ் போலீஸ் படை',
    },
    'official_motto': {
      'en': 'Protected Force | Empowered Family | Resilient Nation',
      'hi': 'सुरक्षित बल | समर्थ परिवार | सशक्त राष्ट्र',
      'ta': 'பாதுகாக்கப்பட்ட படை | அதிகாரம் பெற்ற குடும்பம் | வலுவான தேசம்',
    },
    'dashboard': {
      'en': 'Dashboard',
      'hi': 'डैशबोर्ड',
      'ta': 'முகப்பு',
    },
    'leave_desk': {
      'en': 'Leave Desk',
      'hi': 'अवकाश पटल',
      'ta': 'விடுப்பு மேசை',
    },
    'duty_roster': {
      'en': 'Duty Roster',
      'hi': 'ड्यूटी रोस्टर',
      'ta': 'பணி அட்டவணை',
    },
    'welfare_health': {
      'en': 'Stress & Health',
      'hi': 'तनाव एवं स्वास्थ्य',
      'ta': 'மனஅழுத்தம் மற்றும் நலன்',
    },
    'profile_audit': {
      'en': 'Profile & Audit',
      'hi': 'प्रोफाइल एवं ऑडिट',
      'ta': 'சுயவிவரம் & தணிக்கை',
    },
    'emergency_sos': {
      'en': '12h Emergency SOS',
      'hi': '12 घंटे आपातकालीन सहायता',
      'ta': '12 மணி நேர அவசர உதவி',
    },
    'buddy_check': {
      'en': 'Buddy Check',
      'hi': 'मित्र सहायता (बडी चेक)',
      'ta': 'நண்பன் நலன் பதிவு',
    },
    'tele_manas': {
      'en': 'Tele-MANAS (14416)',
      'hi': 'टेली-मानस (14416)',
      'ta': 'டெலி-மானஸ் (14416)',
    },
    'operational_readiness': {
      'en': 'Operational Readiness',
      'hi': 'ऑपरेशनल तत्परता',
      'ta': 'செயல்பாட்டு தயார்நிலை',
    },
    'strain_index': {
      'en': 'Predictive Strain Index',
      'hi': 'पूर्वानुमानित तनाव सूचकांक',
      'ta': 'முன்கணிப்பு அழுத்த குறியீடு',
    },
    'rest_barrier': {
      'en': '8-Hour Rest Barrier',
      'hi': '8 घंटे का अनिवार्य विश्राम',
      'ta': '8 மணி நேர கட்டாய ஓய்வு',
    },
    'active_requests': {
      'en': 'Active Applications',
      'hi': 'सक्रिय आवेदन',
      'ta': 'செயலில் உள்ள விண்ணப்பங்கள்',
    },
    'login': {
      'en': 'Sign In',
      'hi': 'प्रवेश करें',
      'ta': 'உள்நுழையவும்',
    },
    'logout': {
      'en': 'Sign Out',
      'hi': 'लॉग आउट',
      'ta': 'வெளியேறு',
    },
    'restricted_notice': {
      'en': 'Restricted Government System — Official Secrets Act / IT Act 2000',
      'hi': 'प्रतिबंधित सरकारी प्रणाली — शासकीय गुप्त बात अधिनियम / आईटी अधिनियम 2000',
      'ta': 'பாதுகாக்கப்பட்ட அரசு தளம் — அதிகாரப்பூர்வ ரகசியங்கள் சட்டம் / ஐடி சட்டம் 2000',
    },
  };

  String tr(String key) {
    return _strings[key]?[_currentLocale] ?? _strings[key]?['en'] ?? key;
  }
}
