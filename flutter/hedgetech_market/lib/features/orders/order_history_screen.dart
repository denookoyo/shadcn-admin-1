import 'package:flutter/material.dart';

class OrderHistoryScreen extends StatelessWidget {
  const OrderHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          title: Text('Orders', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final isPaid = index.isEven;
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  title: Text('Order #HD-${2300 + index} · ${isPaid ? 'Paid' : 'Awaiting payment'}'),
                  subtitle: Text(isPaid ? 'Dispatch to buyer scheduled' : 'Tap to send reminder'),
                  trailing: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('AUD ${(220 + index * 12).toStringAsFixed(0)}', style: theme.textTheme.titleMedium),
                      const SizedBox(height: 4),
                      Text(isPaid ? 'ETA 24 Aug' : 'Created 23 Aug', style: theme.textTheme.bodySmall),
                    ],
                  ),
                  onTap: () {},
                ),
              );
            },
            childCount: 8,
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.file_download_outlined),
              label: const Text('Export orders CSV'),
            ),
          ),
        ),
      ],
    );
  }
}
