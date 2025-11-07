import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:riverpod/riverpod.dart';

import '../../core/network/api_client.dart';
import 'models/product.dart';

Future<Map<String, dynamic>>? _sampleCatalogFuture;

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return CatalogRepository(client: client);
});

final featuredProductsProvider = FutureProvider<List<Product>>((ref) async {
  final repository = ref.watch(catalogRepositoryProvider);
  try {
    final products = await repository.listProducts(limit: 12);
    if (products.isNotEmpty) return products;
  } catch (_) {
    // fall back to bundled data below
  }
  return _loadBundledProducts();
});

final productByIdProvider = FutureProvider.family<Product, String>((ref, productId) async {
  final repository = ref.watch(catalogRepositoryProvider);
  try {
    return await repository.getProduct(productId);
  } catch (_) {
    final products = await _loadBundledProducts();
    return products.firstWhere((product) =>
        product.id == productId || product.slug == productId,
        orElse: () => products.first);
  }
});

final categoriesProvider = FutureProvider<List<String>>((ref) async {
  final repository = ref.watch(catalogRepositoryProvider);
  try {
    final categories = await repository.listCategories();
    if (categories.isNotEmpty) return categories;
  } catch (_) {
    // ignore and fall back
  }
  return _loadBundledCategories();
});

class CatalogRepository {
  CatalogRepository({required this.client});

  final ApiClient client;

  Future<List<Product>> listProducts({int limit = 20}) async {
    if (client.baseUrl.isEmpty) {
      final bundled = await _loadBundledProducts();
      return bundled.take(limit).toList();
    }
    final data = await client.get('/external/products', query: {'limit': limit});
    final list = (data is List<dynamic>)
        ? data
        : (data as Map<String, dynamic>)['products'] as List<dynamic>? ?? const <dynamic>[];
    return list.cast<Map<String, dynamic>>().map(Product.fromJson).toList();
  }

  Future<Product> getProduct(String id) async {
    if (client.baseUrl.isEmpty) {
      final bundled = await _loadBundledProducts();
      final match = bundled.firstWhere(
        (product) => product.id == id || product.slug == id,
        orElse: () => bundled.first,
      );
      return match;
    }
    final data = await client.get('/external/products/$id');
    final payload = (data is Map<String, dynamic>)
        ? (data['product'] as Map<String, dynamic>? ?? data)
        : data as Map<String, dynamic>;
    return Product.fromJson(payload);
  }

  Future<List<String>> listCategories() async {
    if (client.baseUrl.isEmpty) {
      return _loadBundledCategories();
    }
    final data = await client.get('/external/categories');
    final list = (data is List<dynamic>)
        ? data
        : (data as Map<String, dynamic>)['categories'] as List<dynamic>? ?? const <dynamic>[];
    return list.map((entry) => entry?.toString() ?? '').where((name) => name.isNotEmpty).toList();
  }
}

Future<List<Product>> _loadBundledProducts() async {
  final payload = await _loadBundledCatalog();
  final list = (payload['products'] as List<dynamic>? ?? const <dynamic>[])
      .cast<Map<String, dynamic>>();
  return list.map(Product.fromJson).toList();
}

Future<List<String>> _loadBundledCategories() async {
  final payload = await _loadBundledCatalog();
  final list = (payload['categories'] as List<dynamic>? ?? const <dynamic>[])
      .cast<String>();
  return list;
}

Future<Map<String, dynamic>> _loadBundledCatalog() async {
  if (_sampleCatalogFuture != null) return _sampleCatalogFuture!;
  _sampleCatalogFuture = rootBundle
      .loadString('assets/sample_catalog.json')
      .then((value) => jsonDecode(value) as Map<String, dynamic>);
  return _sampleCatalogFuture!;
}
