import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  // --- Localized Strings ---
  String get appName => 'وصلك';
  String get loginTitle => locale.languageCode == 'en' ? 'Login' : 'تسجيل الدخول';
  String get loginSubtitle => locale.languageCode == 'en' ? 'Welcome back to Wassalk' : 'أهلاً بك مجدداً في عائلة وصلك';
  String get phoneNumber => locale.languageCode == 'en' ? 'Phone Number' : 'رقم الهاتف';
  String get password => locale.languageCode == 'en' ? 'Password' : 'كلمة المرور';
  String get forgotPassword => locale.languageCode == 'en' ? 'Forgot Password?' : 'نسيت كلمة المرور؟';
  String get loginButton => locale.languageCode == 'en' ? 'Login' : 'دخول';
  String get noAccount => locale.languageCode == 'en' ? "Don't have an account?" : 'لا تمتلك حساباً؟';
  String get createNewAccount => locale.languageCode == 'en' ? 'Create new account' : 'إنشاء حساب جديد';

  // Home Specific
  String get deliveryTo => locale.languageCode == 'en' ? 'Delivery to' : 'التوصيل إلى';
  String get searchHint => locale.languageCode == 'en' ? 'Search for restaurants, grocery...' : 'ابحث عن مطاعم، بقالة، صيدليات...';
  String get categoriesTitle => locale.languageCode == 'en' ? 'Explore Categories' : 'استكشف الفئات';
  String get featuredRestaurants => locale.languageCode == 'en' ? 'Featured This Week' : 'المميزون هذا الأسبوع 🔥';
  String get seeAll => locale.languageCode == 'en' ? 'See All' : 'عرض الكل';

  // Categories
  String get catRestaurants => locale.languageCode == 'en' ? 'Restaurants' : 'مطاعم';
  String get catGrocery => locale.languageCode == 'en' ? 'Grocery' : 'بقالة';
  String get catPharmacy => locale.languageCode == 'en' ? 'Pharmacy' : 'صيدليات';
  String get catShopping => locale.languageCode == 'en' ? 'Shopping' : 'تسوق';
  String get catCafe => locale.languageCode == 'en' ? 'Cafe' : 'قهاوي';

  // Bottom Nav
  String get navHome => locale.languageCode == 'en' ? 'Home' : 'الرئيسية';
  String get navOrders => locale.languageCode == 'en' ? 'Orders' : 'طلباتي';
  String get navWallet => locale.languageCode == 'en' ? 'Wallet' : 'المحفظة';
  String get navProfile => locale.languageCode == 'en' ? 'Profile' : 'حسابي';

  // New keys for screens
  String get yourWallet => locale.languageCode == 'en' ? 'My Wallet' : 'محفظتي';
  String get transactionHistory => locale.languageCode == 'en' ? 'Transactions' : 'سجل العمليات';
  String get viewAll => locale.languageCode == 'en' ? 'View All' : 'عرض الكل';
  String get myCart => locale.languageCode == 'en' ? 'My Cart' : 'سلتي';
  String get checkout => locale.languageCode == 'en' ? 'Checkout' : 'إتمام الطلب';
  String get deliveryAddress => locale.languageCode == 'en' ? 'Delivery Address' : 'عنوان التوصيل';
  String get paymentMethod => locale.languageCode == 'en' ? 'Payment Method' : 'طريقة الدفع';
  String get totalProducts => locale.languageCode == 'en' ? 'Total Products' : 'إجمالي المنتجات';
  String get totalAmount => locale.languageCode == 'en' ? 'Total Amount' : 'المبلغ الإجمالي';
  String get myOrders => locale.languageCode == 'en' ? 'My Orders' : 'طلباتي';
  String get logout => locale.languageCode == 'en' ? 'Logout' : 'تسجيل الخروج';
  String get welcomeMessage => locale.languageCode == 'en' ? 'Welcome Back' : 'أهلاً بك مجدداً';
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'ar'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
