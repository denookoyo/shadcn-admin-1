import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../features/catalog/views/catalog_screen.dart';
import '../../features/catalog/views/product_detail_screen.dart';
import '../../features/chat/assistant_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/orders/order_history_screen.dart';
import '../../features/pos/pos_screen.dart';
import '../../widgets/shell_scaffold.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/marketplace',
    routes: [
      ShellRoute(
        builder: (context, state, child) => ShellScaffold(child: child),
        routes: [
          GoRoute(
            path: '/marketplace',
            pageBuilder: (context, state) => const NoTransitionPage(child: HomeScreen()),
            routes: [
              GoRoute(
                path: 'listings',
                pageBuilder: (context, state) => const NoTransitionPage(child: CatalogScreen()),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) {
                      final productId = state.pathParameters['id'] ?? '';
                      return ProductDetailScreen(productId: productId);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: '/orders',
            pageBuilder: (context, state) => const NoTransitionPage(child: OrderHistoryScreen()),
          ),
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) => const NoTransitionPage(child: DashboardScreen()),
          ),
          GoRoute(
            path: '/assistant',
            pageBuilder: (context, state) {
              final extra = state.extra;
              final productId = extra is Map<String, dynamic> ? extra['productId'] as String? : null;
              return NoTransitionPage(child: AssistantScreen(initialProductId: productId));
            },
          ),
          GoRoute(
            path: '/pos',
            pageBuilder: (context, state) => const NoTransitionPage(child: PosScreen()),
          ),
        ],
      ),
    ],
    errorPageBuilder: (context, state) => MaterialPage(
      child: Scaffold(
        body: Center(
          child: Text('Route not found: ${state.error}'),
        ),
      ),
    ),
  );
});
