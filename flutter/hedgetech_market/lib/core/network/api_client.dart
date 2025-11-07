import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:riverpod/riverpod.dart';

import '../config/config.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
    apiKey: AppConfig.productsApiKey,
  );
});

class ApiClient {
  ApiClient({required this.baseUrl, this.apiKey});

  final String baseUrl;
  final String? apiKey;

  Uri _resolve(String path, [Map<String, dynamic>? queryParameters]) {
    final baseUri = Uri.parse(baseUrl);
    final normalisedPath = path.startsWith('/') ? path : '/$path';
    final resolved = baseUri.resolve(normalisedPath);
    if (queryParameters == null || queryParameters.isEmpty) return resolved;
    return resolved.replace(
      queryParameters: queryParameters.map((key, value) => MapEntry(key, '$value')),
    );
  }

  Map<String, String> _headers([Map<String, String>? override]) {
    final headers = <String, String>{'Accept': 'application/json'};
    if (apiKey != null && apiKey!.isNotEmpty) headers['x-api-key'] = apiKey!;
    if (override != null) headers.addAll(override);
    return headers;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final response = await http.get(_resolve(path, query), headers: _headers());
    if (response.statusCode >= 400) {
      throw ApiException('GET $path failed: ${response.statusCode}', response.body);
    }
    return jsonDecode(response.body);
  }
}

class ApiException implements Exception {
  ApiException(this.message, [this.body]);

  final String message;
  final String? body;

  @override
  String toString() => 'ApiException: $message';
}
