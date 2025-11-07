import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final headline = theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700);

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          title: Text('Seller Dashboard', style: headline),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('This week', style: theme.textTheme.labelMedium?.copyWith(letterSpacing: 1.1)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: const [
                    _MetricCard(title: 'Revenue', value: 'AUD 18.3k', caption: '+12% vs last week'),
                    _MetricCard(title: 'Orders', value: '47', caption: '18 pending fulfilment'),
                    _MetricCard(title: 'Avg. rating', value: '4.8', caption: 'Across 123 reviews'),
                  ],
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: () => context.go('/pos'),
                  icon: const Icon(Icons.point_of_sale_outlined),
                  label: const Text('Open omnichannel POS'),
                ),
                const SizedBox(height: 24),
                Text('Logistics queue', style: headline),
                const SizedBox(height: 12),
                const _TaskTile(
                  title: 'Amazing Freight · Docket #AF-2381',
                  subtitle: 'Awaiting proof-of-delivery upload',
                  trailing: 'Due today',
                ),
                const _TaskTile(
                  title: 'Rapid Dispatch · Service slot',
                  subtitle: 'Buyer requested appointment confirmation',
                  trailing: 'Set reminder',
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: LinearGradient(
                      colors: [theme.colorScheme.primary, theme.colorScheme.primary.withOpacity(0.7)],
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.auto_graph_rounded, size: 48, color: Colors.white),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Insights snapshot', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18)),
                            const SizedBox(height: 8),
                            Text(
                              'AI suggests promoting bundled freight + maintenance packages. Expected uplift: 19%.',
                              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () {},
                        child: const Text('View playbook', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.title, required this.value, required this.caption});

  final String title;
  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: 180,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: theme.textTheme.labelMedium?.copyWith(color: const Color(0xFF64748B))),
              const SizedBox(height: 8),
              Text(value, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(caption, style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF64748B))),
            ],
          ),
        ),
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.title, required this.subtitle, required this.trailing});

  final String title;
  final String subtitle;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        title: Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: Text(trailing, style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.primary)),
      ),
    );
  }
}
