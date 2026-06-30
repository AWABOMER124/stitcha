import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/splash/presentation/screens/splash_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/common/presentation/widgets/main_scaffold.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/signup_screen.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/cart/presentation/screens/store_details_screen.dart';
import '../../features/cart/presentation/screens/cart_screen.dart';
import '../../features/orders/presentation/screens/checkout_screen.dart';
import '../../features/orders/presentation/screens/order_tracking_screen.dart';
import '../../features/orders/presentation/screens/orders_history_screen.dart';
import '../../features/wallet/presentation/screens/wallet_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';

/// Routes that require the user to be authenticated.
/// Attempting to navigate to any of these while logged out
/// will redirect to /login automatically.
const _protectedRoutes = [
  '/checkout',
  '/cart',
  '/orders',
  '/wallet',
  '/tracking',
];

final appRouterProvider = Provider<GoRouter>((ref) {
  // GoRouter listens to auth state reactively.
  // When user logs in or out, router automatically re-evaluates redirects.
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: true,

    // ✅ FIXED: Auth Guard — protects sensitive routes.
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      if (isLoading) return null; // Wait for auth state to resolve

      final isAuthenticated = authState.value != null;
      final currentPath = state.matchedLocation;

      // Check if the user is trying to reach a protected route
      final isGoingToProtected = _protectedRoutes.any(
        (route) => currentPath.startsWith(route),
      );

      // Not logged in + trying to access protected area → redirect to login
      if (!isAuthenticated && isGoingToProtected) {
        return '/login';
      }

      // Already logged in + going to login/signup → redirect to home
      if (isAuthenticated &&
          (currentPath == '/login' || currentPath == '/signup')) {
        return '/';
      }

      return null; // No redirect needed
    },

    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/store/:id',
        builder: (context, state) =>
            StoreDetailsScreen(storeId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/cart',
        builder: (context, state) => const CartScreen(),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => const CheckoutScreen(),
      ),
      GoRoute(
        path: '/tracking/:id',
        builder: (context, state) =>
            OrderTrackingScreen(orderId: state.pathParameters['id']!),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return MainScaffold(child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/orders',
            builder: (context, state) => const OrdersHistoryScreen(),
          ),
          GoRoute(
            path: '/wallet',
            builder: (context, state) => const WalletScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});
