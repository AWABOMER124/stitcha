import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import 'package:wassalk_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:wassalk_app/features/orders/domain/order_model.dart';
import 'package:wassalk_app/features/orders/presentation/providers/order_providers.dart';

class OrdersHistoryScreen extends ConsumerWidget {
  const OrdersHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userState = ref.watch(authProvider);
    final loc = AppLocalizations.of(context)!;

    return userState.when(
      data: (user) =>
          user == null ? _GuestView(loc: loc) : _OrdersView(loc: loc),
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, __) => Scaffold(
        body: Center(
          child: ElevatedButton(
            onPressed: () => ref.invalidate(authProvider),
            child: const Text('إعادة المحاولة'),
          ),
        ),
      ),
    );
  }
}

class _OrdersView extends ConsumerWidget {
  final AppLocalizations loc;

  const _OrdersView({required this.loc});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(orderHistoryProvider);
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text(loc.myOrders,
              style: AppTextStyles.titleMedium
                  .copyWith(fontWeight: FontWeight.w900)),
          bottom: const TabBar(
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textHint,
            indicatorColor: AppColors.primary,
            tabs: [Tab(text: 'الطلبات النشطة'), Tab(text: 'الطلبات السابقة')],
          ),
        ),
        body: history.when(
          loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.primary)),
          error: (_, __) =>
              _ErrorState(onRetry: () => ref.invalidate(orderHistoryProvider)),
          data: (orders) {
            final active = orders
                .where((order) =>
                    !const {'completed', 'cancelled'}.contains(order.status))
                .toList();
            final past = orders
                .where((order) =>
                    const {'completed', 'cancelled'}.contains(order.status))
                .toList();
            return TabBarView(
              children: [
                _OrderList(orders: active, emptyMessage: 'لا توجد طلبات نشطة'),
                _OrderList(orders: past, emptyMessage: 'لا توجد طلبات سابقة'),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _OrderList extends StatelessWidget {
  final List<OrderModel> orders;
  final String emptyMessage;

  const _OrderList({required this.orders, required this.emptyMessage});

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.receipt_long_rounded,
                size: 64, color: AppColors.greyMedium),
            const SizedBox(height: 16),
            Text(emptyMessage,
                style: AppTextStyles.bodyLarge
                    .copyWith(color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        final container = ProviderScope.containerOf(context);
        container.invalidate(orderHistoryProvider);
        await container.read(orderHistoryProvider.future);
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.xl),
        itemCount: orders.length,
        itemBuilder: (context, index) => _OrderCard(order: orders[index]),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderModel order;

  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final status = _statusInfo(order.status);
    final parsedDate = DateTime.tryParse(order.date)?.toLocal();
    final formattedDate = parsedDate == null
        ? order.date
        : DateFormat('yyyy/MM/dd – HH:mm').format(parsedDate);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () => context.push('/tracking/${order.id}'),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: status.color.withValues(alpha: 0.1),
                    child: Icon(status.icon, color: status.color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(order.storeName,
                            style: AppTextStyles.bodyLarge
                                .copyWith(fontWeight: FontWeight.w900)),
                        Text(status.label,
                            style: TextStyle(
                                color: status.color,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      color: AppColors.textHint),
                ],
              ),
              const Divider(height: 28),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(formattedDate,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary)),
                  Text('${order.totalAmount.toStringAsFixed(0)} ج.س',
                      style: AppTextStyles.bodyLarge.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w900)),
                ],
              ),
              if (order.address?.isNotEmpty == true) ...[
                const SizedBox(height: 10),
                Text(order.address!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

({String label, IconData icon, Color color}) _statusInfo(String status) {
  switch (status) {
    case 'preparing':
      return (
        label: 'قيد التحضير',
        icon: Icons.soup_kitchen_rounded,
        color: AppColors.info
      );
    case 'delivering':
      return (
        label: 'في الطريق',
        icon: Icons.delivery_dining_rounded,
        color: AppColors.primary
      );
    case 'completed':
      return (
        label: 'تم التوصيل',
        icon: Icons.check_circle_rounded,
        color: AppColors.success
      );
    case 'cancelled':
      return (
        label: 'ملغي',
        icon: Icons.cancel_rounded,
        color: AppColors.error
      );
    default:
      return (
        label: 'بانتظار المتجر',
        icon: Icons.hourglass_empty_rounded,
        color: AppColors.accent
      );
  }
}

class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;

  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded,
              size: 64, color: AppColors.greyMedium),
          const SizedBox(height: 16),
          const Text('تعذر تحميل الطلبات'),
          const SizedBox(height: 16),
          ElevatedButton(
              onPressed: onRetry, child: const Text('إعادة المحاولة')),
        ],
      ),
    );
  }
}

class _GuestView extends StatelessWidget {
  final AppLocalizations loc;

  const _GuestView({required this.loc});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.receipt_long_rounded,
                  size: 80, color: AppColors.greyMedium),
              const SizedBox(height: 24),
              Text(loc.myOrders, style: AppTextStyles.titleLarge),
              const SizedBox(height: 12),
              const Text('سجل دخولك لمشاهدة طلباتك الحقيقية وتتبعها.',
                  textAlign: TextAlign.center),
              const SizedBox(height: 28),
              ElevatedButton(
                  onPressed: () => context.push('/login'),
                  child: const Text('تسجيل الدخول')),
            ],
          ),
        ),
      ),
    );
  }
}
