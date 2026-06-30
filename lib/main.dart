import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/routing/app_router.dart';
import 'core/localization/app_localizations.dart';
import 'core/localization/locale_provider.dart';
import 'core/notifications/fcm_service.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/ui_constants.dart';

// Firebase setup (one-time):
//   1. Install FlutterFire CLI: dart pub global activate flutterfire_cli
//   2. Run: flutterfire configure  (generates lib/firebase_options.dart)
//   3. Uncomment the two imports below:
// import 'package:firebase_core/firebase_core.dart';
// import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Uncomment after running `flutterfire configure`:
  // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  runApp(const ProviderScope(child: WassalkApp()));
}

class WassalkApp extends ConsumerWidget {
  const WassalkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Initialize FCM after the widget tree is ready
    ref.listen(fcmServiceProvider, (_, service) {
      service.initialize();
    });

    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeProvider);

    return MaterialApp.router(
      title: 'Wassalk - وصلك',
      debugShowCheckedModeBanner: false,

      routerConfig: router,

      locale: locale,
      supportedLocales: const [
        Locale('ar'),
        Locale('en'),
      ],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      theme: ThemeData(
        useMaterial3: true,
        primaryColor: AppColors.primary,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          secondary: AppColors.secondary,
          surface: AppColors.surface,
          error: AppColors.error,
        ),
        textTheme: (locale.languageCode == 'ar'
                ? GoogleFonts.notoKufiArabicTextTheme(Theme.of(context).textTheme)
                : GoogleFonts.interTextTheme(Theme.of(context).textTheme))
            .apply(
          bodyColor: AppColors.textPrimary,
          displayColor: AppColors.textPrimary,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surface,
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: AppColors.textPrimary),
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            fontFamily: 'Noto Kufi Arabic',
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            padding: const EdgeInsets.symmetric(vertical: 16),
            textStyle: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
      ),
    );
  }
}
