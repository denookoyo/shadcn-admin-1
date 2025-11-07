import 'package:flutter/material.dart';

enum ProductType { goods, service }

class Product {
  Product({
    required this.id,
    required this.slug,
    required this.title,
    required this.description,
    required this.price,
    required this.type,
    required this.imageUrl,
    required this.seller,
    this.rating,
    this.tags = const <String>[],
    this.gallery = const <String>[],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final tags = (json['tags'] as List<dynamic>?)?.cast<String>() ?? const <String>[];
    final images = (json['images'] as List<dynamic>?)?.cast<String>() ?? const <String>[];
    return Product(
      id: json['id'] as String,
      slug: json['slug'] as String? ?? (json['id'] as String? ?? ''),
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      price: (json['price'] as num).toDouble(),
      type: (json['type'] as String) == 'service' ? ProductType.service : ProductType.goods,
      imageUrl: json['image'] as String? ?? '',
      seller: json['seller'] as String? ?? 'Marketplace seller',
      rating: (json['rating'] as num?)?.toDouble(),
      tags: tags,
      gallery: images,
    );
  }

  final String id;
  final String slug;
  final String title;
  final String description;
  final double price;
  final ProductType type;
  final String imageUrl;
  final String seller;
  final double? rating;
  final List<String> tags;
  final List<String> gallery;

  Color get badgeColor => type == ProductType.service ? const Color(0xFF2563EB) : const Color(0xFF0F766E);
}
