// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'وصلك';

  @override
  String get loginTitle => 'تسجيل الدخول';

  @override
  String get loginSubtitle => 'أهلاً بك مجدداً في عائلة وصلك';

  @override
  String get phoneNumber => 'رقم الهاتف';

  @override
  String get password => 'كلمة المرور';

  @override
  String get forgotPassword => 'نسيت كلمة المرور؟';

  @override
  String get loginButton => 'دخول';

  @override
  String get noAccount => 'لا تمتلك حساباً؟';

  @override
  String get createNewAccount => 'إنشاء حساب جديد';

  @override
  String welcomeBack(String name) {
    return 'أهلاً بك، $name';
  }

  @override
  String get welcomeMessage => 'أهلاً بك مجدداً';

  @override
  String get searchHint => 'ابحث عن مطعم أو وجبة...';

  @override
  String get categories => 'التصنيفات';

  @override
  String get featuredStores => 'المتاجر المتميزة';

  @override
  String get seeAll => 'عرض الكل';

  @override
  String get allStores => 'كل المتاجر';

  @override
  String get orderHistory => 'تاريخ الطلبات';

  @override
  String get orderStatus => 'حالة الطلب';

  @override
  String get trackOrder => 'تتبع الطلب';

  @override
  String get ongoingOrders => 'طلبات جارية';

  @override
  String get completedOrders => 'طلبات مكتملة';

  @override
  String get orderReceived => 'تم استلام الطلب';

  @override
  String get orderPreparing => 'جاري التجهيز';

  @override
  String get outForDelivery => 'المندوب في الطريق';

  @override
  String get orderDelivered => 'تم التوصيل بنجاح';

  @override
  String get orderCancelled => 'تم إلغاء الطلب';

  @override
  String get myOrders => 'طلباتي';

  @override
  String get yourWallet => 'محفظتي';

  @override
  String get currentBalance => 'الرصيد الحالي';

  @override
  String get topUp => 'شحن الرصيد';

  @override
  String get transactions => 'العمليات الأخيرة';

  @override
  String get noTransactions => 'لا يوجد عمليات سابقة';

  @override
  String get transactionHistory => 'سجل العمليات';

  @override
  String get viewAll => 'عرض الكل';

  @override
  String get cart => 'سلة التسوق';

  @override
  String get myCart => 'سلتي';

  @override
  String get emptyCart => 'السلة فارغة، أضف بعض الوجبات!';

  @override
  String get subtotal => 'المجموع الفرعي';

  @override
  String get deliveryFee => 'رسوم التوصيل';

  @override
  String get total => 'الإجمالي';

  @override
  String get checkout => 'إتمام الطلب';

  @override
  String get promoCode => 'كود الخصم';

  @override
  String get apply => 'تطبيق';

  @override
  String get deliveryAddress => 'عنوان التوصيل';

  @override
  String get paymentMethod => 'طريقة الدفع';

  @override
  String get totalProducts => 'إجمالي المنتجات';

  @override
  String get totalAmount => 'المبلغ الإجمالي';

  @override
  String get profile => 'الملف الشخصي';

  @override
  String get settings => 'الإعدادات';

  @override
  String get helpSupport => 'الدعم والمساندة';

  @override
  String get chatWithSupport => 'تحدث مع الدعم';

  @override
  String get language => 'اللغة';

  @override
  String get logout => 'تسجيل الخروج';
}
