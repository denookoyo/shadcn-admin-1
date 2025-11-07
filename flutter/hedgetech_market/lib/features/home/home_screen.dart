import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../catalog/catalog_repository.dart';
import '../catalog/models/product.dart';
import '../catalog/widgets/product_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final productsAsync = ref.watch(featuredProductsProvider);
    final categoriesAsync = ref.watch(categoriesProvider);

    final products = productsAsync.asData?.value ?? const <Product>[];
    final categories = categoriesAsync.asData?.value ?? const <String>[];
    final goodsCount = products.where((item) => item.type == ProductType.goods).length;
    final servicesCount = products.where((item) => item.type == ProductType.service).length;
    final avgRating = products.isEmpty
        ? 4.9
        : products
                .map((item) => item.rating ?? 4.8)
                .reduce((value, element) => value + element) /
            products.length;

    final heroStats = [
      HeroStat(
        label: 'Live listings',
        value: products.isEmpty ? '18' : products.length.toString(),
        hint: '${goodsCount} goods • ${servicesCount} services',
      ),
      HeroStat(
        label: 'Active categories',
        value: categories.isEmpty ? '12' : categories.length.toString(),
        hint: 'Expanding weekly',
      ),
      HeroStat(
        label: 'Average seller rating',
        value: '${avgRating.toStringAsFixed(1)}/5',
        hint: 'Verified reviews',
      ),
      const HeroStat(
        label: 'Orders fulfilled this week',
        value: '312',
        hint: 'Marketplace-wide',
      ),
    ];

    final heroShowcase = products.isEmpty ? null : products.first;
    final spotlight = products.take(3).toList();

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 20),
            child: _HeroSection(
              stats: heroStats,
              showcase: heroShowcase,
              onBrowse: () => context.go('/marketplace/listings'),
              onLaunchSeller: () => context.go('/dashboard'),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _QuickActionsSection(
              buyerActions: _buyerActions,
              sellerActions: _sellerActions,
              onNavigate: (route) => context.go(route),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 28, 16, 12),
            child: _SectionHeader(
              title: 'Marketplace spotlight',
              subtitle: 'Featured goods and services trending with Hedgetech buyers right now.',
              actionLabel: 'View all listings',
              onActionPressed: () => context.go('/marketplace/listings'),
            ),
          ),
        ),
        if (spotlight.isEmpty)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: _EmptyPlaceholder(
                message:
                    'No listings yet. Add your first product from the seller cockpit.',
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            sliver: SliverGrid(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _SpotlightCard(product: spotlight[index]),
                childCount: spotlight.length,
              ),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 1,
                mainAxisExtent: 240,
                mainAxisSpacing: 16,
              ),
            ),
          ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: _SectionHeader(
              title: 'Trending categories',
              subtitle: 'Stay ahead with Hedgetech verified suppliers.',
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: categories.isEmpty
                ? const _EmptyPlaceholder(
                    message:
                        'Categories will appear here once the marketplace upstream API is connected.',
                  )
                : Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: categories
                        .map((name) => _CategoryChip(
                              label: name,
                              onPressed: () => context.go('/marketplace/listings'),
                            ))
                        .toList(),
                  ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 28, 16, 12),
            child: _WhySellersChoose(theme: theme),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            child: _AssistantTeaser(
              onLaunch: () => context.go('/assistant'),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 48),
          sliver: SliverToBoxAdapter(
            child: _FeaturedGrid(products: products),
          ),
        ),
      ],
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({
    required this.stats,
    required this.showcase,
    required this.onBrowse,
    required this.onLaunchSeller,
  });

  final List<HeroStat> stats;
  final Product? showcase;
  final VoidCallback onBrowse;
  final VoidCallback onLaunchSeller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(32),
        gradient: const LinearGradient(
          colors: [Color(0xFF102534), Color(0xFF0F766E), Color(0xFF34D399)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            left: -120,
            top: 40,
            child: Container(
              height: 220,
              width: 220,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0x3300BFA5),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: ShapeDecoration(
                    color: Colors.white.withOpacity(0.15),
                    shape: StadiumBorder(
                      side: BorderSide(color: Colors.white.withOpacity(0.2)),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome, size: 16, color: Colors.white.withOpacity(0.9)),
                      const SizedBox(width: 8),
                      Text(
                        'Interactive marketplace platform',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: 'Trade with confidence on ',
                        style: theme.textTheme.displaySmall?.copyWith(
                          fontSize: 32,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      TextSpan(
                        text: 'Hedgetech Marketplace',
                        style: theme.textTheme.displaySmall?.copyWith(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFFDCFCE7),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Connect buyers and sellers across goods and services with built-in fulfilment, messaging, and analytics. A single command centre for modern commerce.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withOpacity(0.85),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    FilledButton(
                      onPressed: onBrowse,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF0F766E),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        shape: const StadiumBorder(),
                        elevation: 0,
                      ),
                      child: const Text('Browse marketplace'),
                    ),
                    OutlinedButton(
                      onPressed: onLaunchSeller,
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.white.withOpacity(0.4)),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        shape: const StadiumBorder(),
                      ),
                      child: const Text('Launch seller cockpit'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: stats.map((stat) => _HeroStatCard(stat: stat)).toList(),
                ),
                if (showcase != null) ...[
                  const SizedBox(height: 24),
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      color: Colors.white.withOpacity(0.12),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            showcase!.imageUrl,
                            height: 64,
                            width: 64,
                            fit: BoxFit.cover,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                showcase!.title,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                showcase!.seller,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: Colors.white.withOpacity(0.75),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          'A${showcase!.price.toStringAsFixed(0)}',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: const Color(0xFFBBF7D0),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionsSection extends StatelessWidget {
  const _QuickActionsSection({
    required this.buyerActions,
    required this.sellerActions,
    required this.onNavigate,
  });

  final List<QuickAction> buyerActions;
  final List<QuickAction> sellerActions;
  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Buyer shortcuts', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.1,
          ),
          itemCount: buyerActions.length,
          itemBuilder: (context, index) => _QuickActionCard(
            action: buyerActions[index],
            onTap: () => onNavigate(buyerActions[index].route),
          ),
        ),
        const SizedBox(height: 24),
        Text('Seller cockpit', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.1,
          ),
          itemCount: sellerActions.length,
          itemBuilder: (context, index) => _QuickActionCard(
            action: sellerActions[index],
            onTap: () => onNavigate(sellerActions[index].route),
          ),
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({required this.action, required this.onTap});

  final QuickAction action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tone = action.tone;
    final background = tone == QuickActionTone.emerald
        ? const Color(0xFFEFFDF6)
        : Colors.white;
    final border = tone == QuickActionTone.emerald
        ? const Color(0xFFBBF7D0)
        : const Color(0xFFE2E8F0);
    final accent = tone == QuickActionTone.emerald
        ? const Color(0xFF047857)
        : const Color(0xFF1E293B);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: border.withOpacity(0.6)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: accent.withOpacity(0.08),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Icon(action.icon, size: 18, color: accent),
            ),
            const SizedBox(height: 12),
            Text(
              action.title,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: accent,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Text(
                action.body,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF475569),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Explore',
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: accent,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpotlightCard extends StatelessWidget {
  const _SpotlightCard({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: () => context.push('/marketplace/listings/${product.slug}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: const [
            BoxShadow(color: Color(0x11000000), blurRadius: 18, offset: Offset(0, 10)),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Image.network(
                product.imageUrl,
                fit: BoxFit.cover,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        product.title,
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'A${product.price.toStringAsFixed(0)}',
                          style: theme.textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF047857),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Seller: ${product.seller}',
                    style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.star_rate_rounded, size: 18, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 4),
                      Text(
                        (product.rating ?? 4.8).toStringAsFixed(1),
                        style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const Spacer(),
                      Text(
                        'View details',
                        style: theme.textTheme.labelSmall?.copyWith(color: const Color(0xFF0F766E)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onActionPressed,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onActionPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle!, style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF64748B))),
              ],
            ],
          ),
        ),
        if (actionLabel != null && onActionPressed != null)
          OutlinedButton(
            onPressed: onActionPressed,
            style: OutlinedButton.styleFrom(
              shape: const StadiumBorder(),
            ),
            child: Text(actionLabel!),
          ),
      ],
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: onPressed,
      backgroundColor: const Color(0xFFF8FAFC),
      side: const BorderSide(color: Color(0xFFE2E8F0)),
    );
  }
}

class _EmptyPlaceholder extends StatelessWidget {
  const _EmptyPlaceholder({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFE2E8F0), style: BorderStyle.solid),
        color: Colors.white,
      ),
      child: Text(
        message,
        style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF64748B)),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _WhySellersChoose extends StatelessWidget {
  const _WhySellersChoose({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    final cards = [
      const _SellerHighlight(
        title: 'Unified pipeline',
        body: 'Orders, chats, and payouts in one dashboard with granular permissions.',
        background: Color(0xFFEFFDF6),
        border: Color(0xFFBBF7D0),
        titleColor: Color(0xFF065F46),
      ),
      const _SellerHighlight(
        title: 'Instant POS',
        body: 'Spin up pop-up stores or in-person sales with QR codes and barcode scanning.',
        background: Color(0xFFF8FAFC),
        border: Color(0xFFE2E8F0),
      ),
      const _SellerHighlight(
        title: 'Trust signals',
        body: 'Verified identity, responsive SLAs, and review summaries build loyalty.',
        background: Colors.white,
        border: Color(0xFFE2E8F0),
      ),
      const _SellerHighlight(
        title: 'Automation ready',
        body: 'Connect logistics, invoicing, and ERP data through the Hedgetech API.',
        background: Colors.white,
        border: Color(0xFFE2E8F0),
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Why sellers choose Hedgetech', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: cards,
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 28,
                  backgroundImage: NetworkImage('https://picsum.photos/seed/hedgetech-seller/200/200'),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '“Hedgetech gave us a single channel for B2B and retail buyers.”',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Coordinate inventory, chat with buyers, issue invoices, and run fulfilment workflows without switching tools.',
                        style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF475569)),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Maya Lee · Founder, Circuit & Co',
                        style: theme.textTheme.labelMedium?.copyWith(color: const Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AssistantTeaser extends StatelessWidget {
  const _AssistantTeaser({required this.onLaunch});

  final VoidCallback onLaunch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFFECFDF5), Color(0xFFE0F2F1)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Hedgetech AI concierge', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              Icon(Icons.auto_awesome, color: const Color(0xFF047857)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Explain what you need and the assistant will curate products, bookings, and checkout links for you.',
            style: theme.textTheme.bodyMedium?.copyWith(color: const Color(0xFF0F172A)),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onLaunch,
            icon: const Icon(Icons.chat_bubble_outline),
            label: const Text('Chat with concierge'),
          ),
        ],
      ),
    );
  }
}

class _SellerHighlight extends StatelessWidget {
  const _SellerHighlight({
    required this.title,
    required this.body,
    required this.background,
    required this.border,
    this.titleColor,
  });

  final String title;
  final String body;
  final Color background;
  final Color border;
  final Color? titleColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: math.max(MediaQuery.of(context).size.width / 2 - 36, 160),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: titleColor ?? theme.textTheme.titleSmall?.color,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF475569)),
          ),
        ],
      ),
    );
  }
}

class _FeaturedGrid extends StatelessWidget {
  const _FeaturedGrid({required this.products});

  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: products.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        mainAxisExtent: 320,
      ),
      itemBuilder: (context, index) => ProductCard(product: products[index]),
    );
  }
}

class HeroStat {
  const HeroStat({required this.label, required this.value, this.hint});

  final String label;
  final String value;
  final String? hint;
}

class _HeroStatCard extends StatelessWidget {
  const _HeroStatCard({required this.stat});

  final HeroStat stat;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: 160,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            stat.label.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: Colors.white.withOpacity(0.75),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            stat.value,
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (stat.hint != null) ...[
            const SizedBox(height: 6),
            Text(
              stat.hint!,
              style: theme.textTheme.labelMedium?.copyWith(
                color: Colors.white.withOpacity(0.7),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class QuickAction {
  const QuickAction({
    required this.icon,
    required this.title,
    required this.body,
    required this.route,
    this.tone = QuickActionTone.emerald,
  });

  final IconData icon;
  final String title;
  final String body;
  final String route;
  final QuickActionTone tone;
}

enum QuickActionTone { emerald, slate }

const _buyerActions = [
  QuickAction(
    icon: Icons.auto_awesome_outlined,
    title: 'Chat with AI concierge',
    body: 'Explain what you need and the assistant will curate products, bookings, and checkout links for you.',
    route: '/assistant',
  ),
  QuickAction(
    icon: Icons.shopping_bag_outlined,
    title: 'Shop curated picks',
    body: 'Explore Hedgetech verified goods and services tailored to your goals.',
    route: '/marketplace/listings',
  ),
  QuickAction(
    icon: Icons.verified_user_outlined,
    title: 'Track your orders',
    body: 'View fulfilment status, confirm deliveries, and escalate issues fast.',
    route: '/orders',
    tone: QuickActionTone.slate,
  ),
  QuickAction(
    icon: Icons.calendar_month_outlined,
    title: 'Book services instantly',
    body: 'Reserve verified providers with availability matched to your timeline.',
    route: '/marketplace/listings',
    tone: QuickActionTone.slate,
  ),
];

const _sellerActions = [
  QuickAction(
    icon: Icons.storefront_outlined,
    title: 'Launch your store',
    body: 'Open a storefront, sync inventory, and receive instant POS orders.',
    route: '/dashboard',
    tone: QuickActionTone.slate,
  ),
  QuickAction(
    icon: Icons.bar_chart_outlined,
    title: 'Monitor performance',
    body: 'See live revenue, pipeline health, and customer sentiment in one place.',
    route: '/dashboard',
  ),
  QuickAction(
    icon: Icons.support_agent_outlined,
    title: 'Resolve support fast',
    body: 'Escalate buyer-facing issues with automatic SLAs and routing.',
    route: '/assistant',
    tone: QuickActionTone.slate,
  ),
  QuickAction(
    icon: Icons.cloud_sync_outlined,
    title: 'Connect your stack',
    body: 'Integrate logistics, invoicing, and ERP data through the Hedgetech API.',
    route: '/dashboard',
  ),
];
