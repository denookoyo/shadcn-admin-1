import 'dart:math';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

import '../catalog/catalog_repository.dart';
import '../catalog/models/product.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  final _searchController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  PayMethod _payMethod = PayMethod.cash;
  bool _submitting = false;
  String? _receiptId;
  CartLine? _editingLine;

  final List<CartLine> _cart = [];

  @override
  void dispose() {
    _searchController.dispose();
    _barcodeController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(featuredProductsProvider);
    final products = productsAsync.asData?.value ?? const <Product>[];
    final formatter = NumberFormat.simpleCurrency(name: 'AUD');
    final filtered = _filteredProducts(products);

    final subtotal = _cart.fold<double>(0, (sum, line) => sum + line.total);
    const taxes = 0.0; // extend with GST support later
    final total = subtotal + taxes;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Point of Sale'),
        actions: [
          IconButton(
            tooltip: 'Clear receipt',
            onPressed: _cart.isEmpty ? null : _clearCart,
            icon: const Icon(Icons.refresh_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= 1024;
              final availableHeight = constraints.maxHeight.isFinite
                  ? constraints.maxHeight
                  : MediaQuery.of(context).size.height - 48;
              final content = isWide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(flex: 7, child: _buildProductPane(filtered, formatter, productsAsync)),
                        const SizedBox(width: 20),
                        Expanded(flex: 4, child: _buildCartPane(formatter, subtotal, taxes, total)),
                      ],
                    )
                  : Column(
                      children: [
                        SizedBox(
                          height: max(420, availableHeight * 0.55),
                          child: _buildProductPane(filtered, formatter, productsAsync),
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          height: max(420, availableHeight * 0.55),
                          child: _buildCartPane(formatter, subtotal, taxes, total),
                        ),
                      ],
                    );
              return content;
            },
          ),
        ),
      ),
    );
  }

  Widget _buildProductPane(
    List<Product> products,
    NumberFormat formatter,
    AsyncValue<List<Product>> async,
  ) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Products', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 18),
            _buildSearchRow(),
            const SizedBox(height: 18),
            Expanded(
              child: async.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => _EmptyNotice(message: 'Could not load products. $error'),
                data: (_) {
                  if (products.isEmpty) {
                    return const _EmptyNotice(message: 'No products found.');
                  }
                  return GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 0.88,
                    ),
                    itemCount: products.length,
                    itemBuilder: (context, index) {
                      final product = products[index];
                      return _ProductTile(
                        product: product,
                        priceText: formatter.format(product.price),
                        onTap: () => _addToCart(product),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchRow() {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _searchController,
            decoration: const InputDecoration(
              labelText: 'Search products…',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: TextField(
            controller: _barcodeController,
            decoration: InputDecoration(
              labelText: 'Scan or enter barcode…',
              suffixIcon: IconButton(
                tooltip: 'Add from barcode',
                icon: const Icon(Icons.qr_code_scanner_outlined),
                onPressed: _handleBarcodeSubmit,
              ),
            ),
            onSubmitted: (_) => _handleBarcodeSubmit(),
          ),
        ),
        const SizedBox(width: 12),
        FilledButton.tonal(
          onPressed: () => _showCameraUnsupportedMessage(context),
          child: const Text('Camera Scan'),
        ),
      ],
    );
  }

  Widget _buildCartPane(NumberFormat formatter, double subtotal, double taxes, double total) {
    final theme = Theme.of(context);
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('Cart', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                ),
                IconButton(
                  tooltip: 'Clear cart',
                  onPressed: _cart.isEmpty ? null : _clearCart,
                  icon: const Icon(Icons.delete_outline),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _cart.isEmpty
                  ? const _EmptyNotice(message: 'No items added yet.')
                  : ListView.separated(
                      itemCount: _cart.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final line = _cart[index];
                        return _CartLineTile(
                          line: line,
                          formatter: formatter,
                          onIncrease: () => _updateQuantity(line.id, line.quantity + 1),
                          onDecrease: () => _updateQuantity(line.id, max(1, line.quantity - 1)),
                          onRemove: () => _removeLine(line.id),
                          onTap: () => _openEditDialog(line),
                        );
                      },
                    ),
            ),
            const Divider(height: 32),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Customer name (optional)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Customer phone (optional)'),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Customer email (optional)'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            SegmentedButton<PayMethod>(
              segments: const [
                ButtonSegment(value: PayMethod.cash, label: Text('Cash')), 
                ButtonSegment(value: PayMethod.card, label: Text('Card')),
              ],
              selected: {_payMethod},
              onSelectionChanged: (value) => setState(() => _payMethod = value.first),
            ),
            const SizedBox(height: 20),
            _SummaryRow(label: 'Subtotal', value: formatter.format(subtotal)),
            const SizedBox(height: 6),
            _SummaryRow(label: 'Tax', value: formatter.format(taxes), labelStyle: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF64748B))),
            const SizedBox(height: 6),
            _SummaryRow(label: 'Total', value: formatter.format(total), labelStyle: theme.textTheme.titleMedium, valueStyle: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _cart.isEmpty || _submitting ? null : () => _checkout(total),
              child: Text(_submitting
                  ? 'Processing…'
                  : _payMethod == PayMethod.cash
                      ? 'Complete Sale (Cash)'
                      : 'Complete Sale (Card)'),
            ),
            if (_receiptId != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    'Sale recorded. Receipt #${_receiptId!.substring(0, 6)} created.',
                    style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF166534)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  List<Product> _filteredProducts(List<Product> products) {
    final term = _searchController.text.trim().toLowerCase();
    if (term.isEmpty) return products;
    return products.where((product) {
      return product.title.toLowerCase().contains(term) ||
          product.slug.toLowerCase().contains(term) ||
          product.seller.toLowerCase().contains(term);
    }).toList();
  }

  void _addToCart(Product product) {
    setState(() {
      final existing = _cart.indexWhere((line) => line.productId == product.id);
      if (existing == -1) {
        _cart.add(CartLine(
          id: 'line_${DateTime.now().millisecondsSinceEpoch}_${product.id}',
          productId: product.id,
          title: product.title,
          type: product.type,
          quantity: 1,
          unitPrice: product.price,
        ));
      } else {
        final line = _cart[existing];
        _cart[existing] = line.copyWith(quantity: line.quantity + 1);
      }
    });
  }

  void _removeLine(String id) {
    setState(() {
      _cart.removeWhere((line) => line.id == id);
    });
  }

  void _updateQuantity(String id, int quantity) {
    setState(() {
      final index = _cart.indexWhere((line) => line.id == id);
      if (index == -1) return;
      final line = _cart[index];
      _cart[index] = line.copyWith(quantity: max(1, quantity));
    });
  }

  void _updateLinePrice(String id, double price) {
    setState(() {
      final index = _cart.indexWhere((line) => line.id == id);
      if (index == -1) return;
      final line = _cart[index];
      _cart[index] = line.copyWith(unitPrice: price.clamp(0, double.infinity));
    });
  }

  void _clearCart() {
    setState(() {
      _cart.clear();
      _receiptId = null;
    });
  }

  void _handleBarcodeSubmit() {
    final code = _barcodeController.text.trim();
    if (code.isEmpty) return;
    final products = ref.read(featuredProductsProvider).asData?.value ?? const <Product>[];
    Product? product;
    for (final item in products) {
      final identifierMatches =
          item.id.toLowerCase() == code.toLowerCase() || item.slug.toLowerCase() == code.toLowerCase();
      if (identifierMatches) {
        product = item;
        break;
      }
    }
    if (product != null) {
      _addToCart(product);
      _barcodeController.clear();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No product matched code $code')),
      );
    }
  }

  Future<void> _checkout(double total) async {
    setState(() {
      _submitting = true;
      _receiptId = null;
    });

    await Future<void>.delayed(const Duration(milliseconds: 600));

    final receiptCode = 'POS-${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}';

    if (!mounted) return;
    setState(() {
      _submitting = false;
      _receiptId = receiptCode;
      _cart.clear();
      _nameController.clear();
      _phoneController.clear();
      _emailController.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Sale recorded. Total ${NumberFormat.simpleCurrency(name: 'AUD').format(total)}.')), 
    );
  }

  void _openEditDialog(CartLine line) {
    setState(() => _editingLine = line);
    final qtyController = TextEditingController(text: line.quantity.toString());
    final priceController = TextEditingController(text: line.unitPrice.toStringAsFixed(2));

    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Edit receipt line'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Text(line.title, style: Theme.of(context).textTheme.titleSmall),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: qtyController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Unit price (A\$)'),
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                _removeLine(line.id);
                Navigator.of(context).pop();
              },
              child: const Text('Remove line'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final qty = int.tryParse(qtyController.text);
                final price = double.tryParse(priceController.text);
                if (qty != null && qty > 0) {
                  _updateQuantity(line.id, qty);
                }
                if (price != null && price >= 0) {
                  _updateLinePrice(line.id, price);
                }
                Navigator.of(context).pop();
              },
              child: const Text('Update line'),
            ),
          ],
        );
      },
    ).then((_) {
      qtyController.dispose();
      priceController.dispose();
      setState(() => _editingLine = null);
    });
  }
}

class CartLine {
  const CartLine({
    required this.id,
    required this.productId,
    required this.title,
    required this.type,
    required this.quantity,
    required this.unitPrice,
  });

  final String id;
  final String productId;
  final String title;
  final ProductType type;
  final int quantity;
  final double unitPrice;

  double get total => unitPrice * quantity;

  CartLine copyWith({
    int? quantity,
    double? unitPrice,
  }) => CartLine(
        id: id,
        productId: productId,
        title: title,
        type: type,
        quantity: quantity ?? this.quantity,
        unitPrice: unitPrice ?? this.unitPrice,
      );
}

enum PayMethod { cash, card }

class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.product,
    required this.priceText,
    required this.onTap,
  });

  final Product product;
  final String priceText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: AspectRatio(
                  aspectRatio: 4 / 3,
                  child: Image.network(
                    product.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(color: const Color(0xFFE2E8F0)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                product.title,
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                product.type.name,
                style: theme.textTheme.labelSmall?.copyWith(color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 8),
              Text(
                priceText,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartLineTile extends StatelessWidget {
  const _CartLineTile({
    required this.line,
    required this.formatter,
    required this.onIncrease,
    required this.onDecrease,
    required this.onRemove,
    required this.onTap,
  });

  final CartLine line;
  final NumberFormat formatter;
  final VoidCallback onIncrease;
  final VoidCallback onDecrease;
  final VoidCallback onRemove;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(line.title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(
                      '${formatter.format(line.unitPrice)} • ${line.type.name}',
                      style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  IconButton(
                    onPressed: onDecrease,
                    icon: const Icon(Icons.remove, size: 20),
                  ),
                  Text('${line.quantity}', style: theme.textTheme.titleSmall),
                  IconButton(
                    onPressed: onIncrease,
                    icon: const Icon(Icons.add, size: 20),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 80,
                child: Text(
                  formatter.format(line.total),
                  textAlign: TextAlign.end,
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              IconButton(
                tooltip: 'Remove item',
                onPressed: onRemove,
                icon: const Icon(Icons.close_rounded, size: 18),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.labelStyle,
    this.valueStyle,
  });

  final String label;
  final String value;
  final TextStyle? labelStyle;
  final TextStyle? valueStyle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: labelStyle ?? theme.textTheme.bodyMedium),
        Text(value, style: valueStyle ?? theme.textTheme.bodyMedium),
      ],
    );
  }
}

class _EmptyNotice extends StatelessWidget {
  const _EmptyNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(24),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF64748B)),
      ),
    );
  }
}

void _showCameraUnsupportedMessage(BuildContext context) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Camera barcode scanning coming soon. Connect a scanner or enter code manually.')),
  );
}
