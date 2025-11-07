# Hedgetech Market (Flutter)

This directory hosts a Flutter reimplementation of the Hedgetech Marketplace experience. The app includes:

- Onboarding splash & authentication entry points
- Marketplace home with featured products and services
- Product catalogue with filters and detail pages
- Embedded AI concierge chat stub mirroring the web assistant
- Seller dashboard placeholders for fulfilment and analytics

## Getting Started

```sh
cd flutter/hedgetech_market
flutter create . --platforms=ios,android,macos,web  # run once to scaffold platform folders
flutter pub get
flutter run --dart-define=HEDGETECH_API_BASE_URL=https://hedgetech.app/api \
  --dart-define=HEDGETECH_PRODUCTS_API_KEY=your-mobile-api-key
```

The app relies on the same backend as the web experience. Configure runtime values via `dart-define` flags (adjust the base URL and keys to match your stack):

```sh
flutter run \
  --dart-define=HEDGETECH_API_BASE_URL=https://your-api.example/api \
  --dart-define=HEDGETECH_PRODUCTS_API_KEY=$EXTERNAL_PRODUCTS_API_KEY \
  --dart-define=CLERK_PUBLISHABLE_KEY=pk_test_123
```

If no values are provided the app will fall back to mock catalogue data bundled in `assets/sample_catalog.json`.

> **Note**: The Express API expects requests to `/api/external/*` to include the `x-api-key` header that matches `EXTERNAL_PRODUCTS_API_KEY` in your server `.env`. Pass the same value to Flutter via `HEDGETECH_PRODUCTS_API_KEY`.

## Project Structure

- `lib/main.dart` – entry point and router
- `lib/core` – theming, configuration, networking utilities
- `lib/features` – feature-specific UI modules (catalogue, cart, orders, assistant, auth)
- `lib/widgets` – shared components (cards, badges, skeletons)

## TODO

- Wire real authentication (Clerk) and marketplace APIs
- Mirror web dashboard metrics once endpoints are available
- Flesh out AI concierge chat with WebSocket or streaming endpoint
