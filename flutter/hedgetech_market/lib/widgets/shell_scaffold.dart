import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ShellScaffold extends StatelessWidget {
  const ShellScaffold({super.key, required this.child});

  final Widget child;

  static const _destinations = [
    _ShellDestination(icon: Icons.home_outlined, label: 'Home', route: '/marketplace'),
    _ShellDestination(icon: Icons.storefront_outlined, label: 'Listings', route: '/marketplace/listings'),
    _ShellDestination(icon: Icons.receipt_long_outlined, label: 'Orders', route: '/orders'),
    _ShellDestination(icon: Icons.dashboard_customize_outlined, label: 'Dashboard', route: '/dashboard'),
    _ShellDestination(icon: Icons.auto_awesome_outlined, label: 'Concierge', route: '/assistant'),
  ];

  int _indexForLocation(String location) {
    var bestMatchLength = -1;
    var bestIndex = 0;
    for (var i = 0; i < _destinations.length; i++) {
      final route = _destinations[i].route;
      if (location.startsWith(route) && route.length > bestMatchLength) {
        bestMatchLength = route.length;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final index = _indexForLocation(location);
    final currentIndex = index >= 0 ? index : 0;
    return Scaffold(
      body: SafeArea(child: child),
      bottomNavigationBar: NavigationBar(
        destinations: _destinations
            .map((destination) => NavigationDestination(
                  icon: Icon(destination.icon),
                  label: destination.label,
                ))
            .toList(),
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          final destination = _destinations[index];
          if (destination.route != location) {
            context.go(destination.route);
          }
        },
      ),
    );
  }
}

class _ShellDestination {
  const _ShellDestination({required this.icon, required this.label, required this.route});

  final IconData icon;
  final String label;
  final String route;
}
