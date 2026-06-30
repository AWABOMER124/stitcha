// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Wassalk';

  @override
  String get loginTitle => 'Login';

  @override
  String get loginSubtitle => 'Welcome back to Wassalk family';

  @override
  String get phoneNumber => 'Phone Number';

  @override
  String get password => 'Password';

  @override
  String get forgotPassword => 'Forgot Password?';

  @override
  String get loginButton => 'Login';

  @override
  String get noAccount => 'Don\'t have an account?';

  @override
  String get createNewAccount => 'Create new account';

  @override
  String welcomeBack(String name) {
    return 'Welcome back, $name';
  }

  @override
  String get welcomeMessage => 'أهلاً بك مجدداً';

  @override
  String get searchHint => 'Search for restaurant or dish...';

  @override
  String get categories => 'Categories';

  @override
  String get featuredStores => 'Featured Stores';

  @override
  String get seeAll => 'See All';

  @override
  String get allStores => 'All Stores';

  @override
  String get orderHistory => 'Order History';

  @override
  String get orderStatus => 'Order Status';

  @override
  String get trackOrder => 'Track Order';

  @override
  String get ongoingOrders => 'Ongoing Orders';

  @override
  String get completedOrders => 'Completed Orders';

  @override
  String get orderReceived => 'Order Received';

  @override
  String get orderPreparing => 'Preparing Order';

  @override
  String get outForDelivery => 'Out for Delivery';

  @override
  String get orderDelivered => 'Order Delivered';

  @override
  String get orderCancelled => 'Order Cancelled';

  @override
  String get myOrders => 'طلباتي';

  @override
  String get yourWallet => 'My Wallet';

  @override
  String get currentBalance => 'Current Balance';

  @override
  String get topUp => 'Top Up';

  @override
  String get transactions => 'Recent Transactions';

  @override
  String get noTransactions => 'No previous transactions';

  @override
  String get transactionHistory => 'سجل العمليات';

  @override
  String get viewAll => 'عرض الكل';

  @override
  String get cart => 'Cart';

  @override
  String get myCart => 'سلتي';

  @override
  String get emptyCart => 'Cart is empty, add some meals!';

  @override
  String get subtotal => 'Subtotal';

  @override
  String get deliveryFee => 'Delivery Fee';

  @override
  String get total => 'Total';

  @override
  String get checkout => 'Checkout';

  @override
  String get promoCode => 'Promo Code';

  @override
  String get apply => 'Apply';

  @override
  String get deliveryAddress => 'عنوان التوصيل';

  @override
  String get paymentMethod => 'طريقة الدفع';

  @override
  String get totalProducts => 'إجمالي المنتجات';

  @override
  String get totalAmount => 'المبلغ الإجمالي';

  @override
  String get profile => 'Profile';

  @override
  String get settings => 'Settings';

  @override
  String get helpSupport => 'Help & Support';

  @override
  String get chatWithSupport => 'Chat with Support';

  @override
  String get language => 'Language';

  @override
  String get logout => 'Logout';
}
