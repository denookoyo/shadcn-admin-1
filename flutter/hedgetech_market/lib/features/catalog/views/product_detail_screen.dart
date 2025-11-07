import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

import '../catalog_repository.dart';
import '../models/product.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int quantity = 1;
  int? selectedSlotIndex;

  @override
  Widget build(BuildContext context) {
    final asyncProduct = ref.watch(productByIdProvider(widget.productId));
    final currency = NumberFormat.simpleCurrency(name: 'AUD');

    return Scaffold(
      body: asyncProduct.when(
        data: (product) {
          final gallery = <String>{
            product.imageUrl,
            ...product.gallery,
          }.where((url) => url.isNotEmpty).toList();
          final heroImage = gallery.isNotEmpty ? gallery.first : product.imageUrl;
          final remainingImages = gallery.skip(1).toList();
          final isService = product.type == ProductType.service;
          final serviceSlots = _mockServiceSlots();

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                expandedHeight: 360,
                flexibleSpace: FlexibleSpaceBar(
                  background: Hero(
                    tag: 'product-${product.id}',
                    child: Image.network(
                      heroImage,
                      fit: BoxFit.cover,
                      errorBuilder: (context, _, __) => Container(
                        color: const Color(0xFFE2E8F0),
                        child: const Icon(Icons.image_not_supported_outlined, size: 48),
                      ),
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          TextButton(
                            onPressed: () => context.go('/marketplace/listings'),
                            child: const Text('Marketplace'),
                          ),
                          const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              product.title,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelMedium
                                  ?.copyWith(color: const Color(0xFF64748B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildGalleryStrip(remainingImages),
                      const SizedBox(height: 20),
                      _buildPrimaryCard(context, product, currency, isService, serviceSlots),
                      const SizedBox(height: 20),
                      _buildAssuranceCard(context),
                      const SizedBox(height: 20),
                      _buildSellerCard(context, product),
                      const SizedBox(height: 20),
                      _buildDetailsSection(context, product),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
        error: (error, _) => Center(child: Text('Error loading product: $error')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }

  Widget _buildGalleryStrip(List<String> images) {
    if (images.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: images.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final image = images[index];
          return ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Image.network(
              image,
              width: 120,
              height: 90,
              fit: BoxFit.cover,
            ),
          );
        },
      ),
    );
  }

  Widget _buildPrimaryCard(
    BuildContext context,
    Product product,
    NumberFormat currency,
    bool isService,
    List<String> serviceSlots,
  ) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Chip(
                  label: Text(product.type.name.toUpperCase()),
                  backgroundColor: const Color(0xFFEFFDF6),
                  side: const BorderSide(color: Color(0xFFBBF7D0)),
                  labelStyle: const TextStyle(color: Color(0xFF047857), fontWeight: FontWeight.w600),
                ),
                Text(
                  'Listing ID ${product.id.substring(0, product.id.length.clamp(0, 6))}',
                  style: Theme.of(context)
                      .textTheme
                      .labelMedium
                      ?.copyWith(color: const Color(0xFF94A3B8)),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              product.title,
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.storefront_outlined, size: 18, color: Color(0xFF047857)),
                const SizedBox(width: 6),
                Text(
                  'Sold by ${product.seller}',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: const Color(0xFF0F766E), fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 10),
                const Icon(Icons.star_rate_rounded, size: 18, color: Color(0xFFF59E0B)),
                const SizedBox(width: 4),
                Text(
                  (product.rating ?? 4.8).toStringAsFixed(1),
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(fontWeight: FontWeight.w600, color: const Color(0xFF475569)),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(
              currency.format(product.price),
              style: Theme.of(context)
                  .textTheme
                  .displaySmall
                  ?.copyWith(fontSize: 32, fontWeight: FontWeight.w700, color: const Color(0xFF0F766E)),
            ),
            const SizedBox(height: 16),
            Text(
              product.description,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(height: 1.5, color: const Color(0xFF475569)),
            ),
            const SizedBox(height: 20),
            if (isService)
              _buildServiceScheduler(context, serviceSlots)
            else
              _buildQuantitySelector(context),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                FilledButton(
                  onPressed: () => context.go('/assistant', extra: {'productId': product.id}),
                  child: Text(isService ? 'Request booking' : 'Add to cart'),
                ),
                OutlinedButton(
                  onPressed: () => context.go('/assistant', extra: {'productId': product.id}),
                  child: const Text('Ask concierge'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuantitySelector(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select quantity',
          style: Theme.of(context)
              .textTheme
              .labelMedium
              ?.copyWith(color: const Color(0xFF64748B), letterSpacing: 0.4),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                onPressed: () => setState(() => quantity = (quantity - 1).clamp(1, 99)),
                icon: const Icon(Icons.remove_rounded),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Text('$quantity', style: Theme.of(context).textTheme.titleMedium),
              ),
              IconButton(
                onPressed: () => setState(() => quantity = (quantity + 1).clamp(1, 99)),
                icon: const Icon(Icons.add_rounded),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildServiceScheduler(BuildContext context, List<String> slots) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Book an appointment',
          style: Theme.of(context)
              .textTheme
              .labelMedium
              ?.copyWith(color: const Color(0xFF64748B), letterSpacing: 0.4),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: List.generate(slots.length, (index) {
            final isSelected = selectedSlotIndex == index;
            return ChoiceChip(
              label: Text(slots[index]),
              selected: isSelected,
              onSelected: (_) => setState(() => selectedSlotIndex = index),
            );
          }),
        ),
        const SizedBox(height: 8),
        Text(
          'Providers confirm bookings within 24 hours. You can reschedule later if needed.',
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(color: const Color(0xFF94A3B8)),
        ),
      ],
    );
  }

  Widget _buildAssuranceCard(BuildContext context) {
    const assurances = [
      'Genuine item verified by Hedgetech operations.',
      'Flexible fulfilment windows and buyer-side support.',
      'Secure payments with instant refund if seller cancels.',
    ];

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Marketplace protection',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            ...assurances.map(
              (assurance) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.verified_outlined, size: 18, color: Color(0xFF047857)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        assurance,
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: const Color(0xFF475569)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSellerCard(BuildContext context, Product product) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: const Color(0xFFF8FAFC),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 32,
            backgroundImage: NetworkImage(product.gallery.isNotEmpty
                ? product.gallery.first
                : 'https://picsum.photos/seed/${product.id}/200/200'),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.seller,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  'Verified Hedgetech seller',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: const Color(0xFF64748B)),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.chat_bubble_outline, size: 18),
                  label: const Text('Message seller'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsSection(BuildContext context, Product product) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Additional details',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: product.tags
              .map((tag) => Chip(
                    label: Text(tag),
                    backgroundColor: const Color(0xFFF1F5F9),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ))
              .toList(),
        ),
        const SizedBox(height: 16),
        Text(
          'Fulfilment',
          style: Theme.of(context)
              .textTheme
              .titleSmall
              ?.copyWith(fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
        ),
        const SizedBox(height: 8),
        Text(
          'Delivery within Australia in 3–5 business days. International shipping available on request.',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: const Color(0xFF475569)),
        ),
      ],
    );
  }

  List<String> _mockServiceSlots() {
    final baseDate = DateTime.now();
    return List.generate(4, (index) {
      final date = baseDate.add(Duration(days: 2 + index));
      return DateFormat('EEE d MMM • h:mm a').format(date);
    });
  }
}
