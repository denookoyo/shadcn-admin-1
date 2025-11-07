import 'dart:io';

class AppConfig {
  AppConfig._();

  static String get apiBaseUrl =>
      const String.fromEnvironment('HEDGETECH_API_BASE_URL', defaultValue: '')
          .ifEmpty(Platform.environment['HEDGETECH_API_BASE_URL'])
          .ifEmpty('https://hedgetech.example/api');

  static String get clerkPublishableKey =>
      const String.fromEnvironment('CLERK_PUBLISHABLE_KEY', defaultValue: '')
          .ifEmpty(Platform.environment['CLERK_PUBLISHABLE_KEY']);

  static String? get productsApiKey {
    const dartDefine = String.fromEnvironment('HEDGETECH_PRODUCTS_API_KEY', defaultValue: '');
    if (dartDefine.isNotEmpty) return dartDefine;
    final envValue = Platform.environment['HEDGETECH_PRODUCTS_API_KEY'];
    if (envValue != null && envValue.isNotEmpty) return envValue;
    return null;
  }
}

extension on String {
  String ifEmpty(String? fallback) {
    if (isEmpty && fallback != null && fallback.isNotEmpty) {
      return fallback;
    }
    return this;
  }
}
