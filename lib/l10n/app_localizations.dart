import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en')
  ];

  /// No description provided for @appName.
  ///
  /// In ar, this message translates to:
  /// **'وصلك'**
  String get appName;

  /// No description provided for @loginTitle.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الدخول'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'أهلاً بك مجدداً في عائلة وصلك'**
  String get loginSubtitle;

  /// No description provided for @phoneNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهاتف'**
  String get phoneNumber;

  /// No description provided for @password.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get password;

  /// No description provided for @forgotPassword.
  ///
  /// In ar, this message translates to:
  /// **'نسيت كلمة المرور؟'**
  String get forgotPassword;

  /// No description provided for @loginButton.
  ///
  /// In ar, this message translates to:
  /// **'دخول'**
  String get loginButton;

  /// No description provided for @noAccount.
  ///
  /// In ar, this message translates to:
  /// **'لا تمتلك حساباً؟'**
  String get noAccount;

  /// No description provided for @createNewAccount.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء حساب جديد'**
  String get createNewAccount;

  /// No description provided for @welcomeBack.
  ///
  /// In ar, this message translates to:
  /// **'أهلاً بك، {name}'**
  String welcomeBack(String name);

  /// No description provided for @welcomeMessage.
  ///
  /// In ar, this message translates to:
  /// **'أهلاً بك مجدداً'**
  String get welcomeMessage;

  /// No description provided for @searchHint.
  ///
  /// In ar, this message translates to:
  /// **'ابحث عن مطعم أو وجبة...'**
  String get searchHint;

  /// No description provided for @categories.
  ///
  /// In ar, this message translates to:
  /// **'التصنيفات'**
  String get categories;

  /// No description provided for @featuredStores.
  ///
  /// In ar, this message translates to:
  /// **'المتاجر المتميزة'**
  String get featuredStores;

  /// No description provided for @seeAll.
  ///
  /// In ar, this message translates to:
  /// **'عرض الكل'**
  String get seeAll;

  /// No description provided for @allStores.
  ///
  /// In ar, this message translates to:
  /// **'كل المتاجر'**
  String get allStores;

  /// No description provided for @orderHistory.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الطلبات'**
  String get orderHistory;

  /// No description provided for @orderStatus.
  ///
  /// In ar, this message translates to:
  /// **'حالة الطلب'**
  String get orderStatus;

  /// No description provided for @trackOrder.
  ///
  /// In ar, this message translates to:
  /// **'تتبع الطلب'**
  String get trackOrder;

  /// No description provided for @ongoingOrders.
  ///
  /// In ar, this message translates to:
  /// **'طلبات جارية'**
  String get ongoingOrders;

  /// No description provided for @completedOrders.
  ///
  /// In ar, this message translates to:
  /// **'طلبات مكتملة'**
  String get completedOrders;

  /// No description provided for @orderReceived.
  ///
  /// In ar, this message translates to:
  /// **'تم استلام الطلب'**
  String get orderReceived;

  /// No description provided for @orderPreparing.
  ///
  /// In ar, this message translates to:
  /// **'جاري التجهيز'**
  String get orderPreparing;

  /// No description provided for @outForDelivery.
  ///
  /// In ar, this message translates to:
  /// **'المندوب في الطريق'**
  String get outForDelivery;

  /// No description provided for @orderDelivered.
  ///
  /// In ar, this message translates to:
  /// **'تم التوصيل بنجاح'**
  String get orderDelivered;

  /// No description provided for @orderCancelled.
  ///
  /// In ar, this message translates to:
  /// **'تم إلغاء الطلب'**
  String get orderCancelled;

  /// No description provided for @myOrders.
  ///
  /// In ar, this message translates to:
  /// **'طلباتي'**
  String get myOrders;

  /// No description provided for @yourWallet.
  ///
  /// In ar, this message translates to:
  /// **'محفظتي'**
  String get yourWallet;

  /// No description provided for @currentBalance.
  ///
  /// In ar, this message translates to:
  /// **'الرصيد الحالي'**
  String get currentBalance;

  /// No description provided for @topUp.
  ///
  /// In ar, this message translates to:
  /// **'شحن الرصيد'**
  String get topUp;

  /// No description provided for @transactions.
  ///
  /// In ar, this message translates to:
  /// **'العمليات الأخيرة'**
  String get transactions;

  /// No description provided for @noTransactions.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد عمليات سابقة'**
  String get noTransactions;

  /// No description provided for @transactionHistory.
  ///
  /// In ar, this message translates to:
  /// **'سجل العمليات'**
  String get transactionHistory;

  /// No description provided for @viewAll.
  ///
  /// In ar, this message translates to:
  /// **'عرض الكل'**
  String get viewAll;

  /// No description provided for @cart.
  ///
  /// In ar, this message translates to:
  /// **'سلة التسوق'**
  String get cart;

  /// No description provided for @myCart.
  ///
  /// In ar, this message translates to:
  /// **'سلتي'**
  String get myCart;

  /// No description provided for @emptyCart.
  ///
  /// In ar, this message translates to:
  /// **'السلة فارغة، أضف بعض الوجبات!'**
  String get emptyCart;

  /// No description provided for @subtotal.
  ///
  /// In ar, this message translates to:
  /// **'المجموع الفرعي'**
  String get subtotal;

  /// No description provided for @deliveryFee.
  ///
  /// In ar, this message translates to:
  /// **'رسوم التوصيل'**
  String get deliveryFee;

  /// No description provided for @total.
  ///
  /// In ar, this message translates to:
  /// **'الإجمالي'**
  String get total;

  /// No description provided for @checkout.
  ///
  /// In ar, this message translates to:
  /// **'إتمام الطلب'**
  String get checkout;

  /// No description provided for @promoCode.
  ///
  /// In ar, this message translates to:
  /// **'كود الخصم'**
  String get promoCode;

  /// No description provided for @apply.
  ///
  /// In ar, this message translates to:
  /// **'تطبيق'**
  String get apply;

  /// No description provided for @deliveryAddress.
  ///
  /// In ar, this message translates to:
  /// **'عنوان التوصيل'**
  String get deliveryAddress;

  /// No description provided for @paymentMethod.
  ///
  /// In ar, this message translates to:
  /// **'طريقة الدفع'**
  String get paymentMethod;

  /// No description provided for @totalProducts.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي المنتجات'**
  String get totalProducts;

  /// No description provided for @totalAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ الإجمالي'**
  String get totalAmount;

  /// No description provided for @profile.
  ///
  /// In ar, this message translates to:
  /// **'الملف الشخصي'**
  String get profile;

  /// No description provided for @settings.
  ///
  /// In ar, this message translates to:
  /// **'الإعدادات'**
  String get settings;

  /// No description provided for @helpSupport.
  ///
  /// In ar, this message translates to:
  /// **'الدعم والمساندة'**
  String get helpSupport;

  /// No description provided for @chatWithSupport.
  ///
  /// In ar, this message translates to:
  /// **'تحدث مع الدعم'**
  String get chatWithSupport;

  /// No description provided for @language.
  ///
  /// In ar, this message translates to:
  /// **'اللغة'**
  String get language;

  /// No description provided for @logout.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get logout;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
