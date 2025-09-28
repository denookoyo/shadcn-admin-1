# Hedgetech Marketplace Redesign Plan

## Vision & Positioning
- **Product name**: Hedgetech Marketplace
- **Tagline**: "Where smart buyers and resilient sellers trade with confidence."
- **North star**: Deliver a dual-sided ecommerce experience where marketplace discovery and operational tooling share a single cohesive interface.

## Primary Personas
1. **Growth-focused seller** – wants storefront management, live order cues, inventory and performance insights.
2. **Value-driven buyer** – expects fast discovery, seller transparency, frictionless checkout, and order tracking.
3. **Marketplace operator** – needs oversight of orders, sellers, and support queues (served via admin dashboards already in codebase).

## Experience Pillars
- **Unified commerce hub** – Marketplace discovery, conversations, and fulfillment live in one flow.
- **Operational clarity** – Dashboards translate data into immediate actions for sellers and buyers.
- **Trust by default** – Identity, review summaries, and fulfillment guarantees surface on every transaction touchpoint.

## Information Architecture
| Level | Route / Section | Purpose |
|-------|-----------------|---------|
| Global | `/marketplace` | Landing hub with discovery, CTAs for buyers/sellers, and live activity.
| Global | `/marketplace/listings` | Searchable catalogue with filters, inline cart interactions, and seller callouts.
| Global | `/marketplace/listing/:slug` | Deep product/service detail, buyer protection highlights, seller profile entry point.
| Global | `/marketplace/merchant/:id` | Seller storefront, ratings distribution, verified credentials, and quick-message CTA.
| Buyer | `/marketplace/cart` → `/checkout` | Guided checkout with timeline + support options.
| Buyer | `/marketplace/my-orders` | Order timeline, status chips, issue escalation.
| Seller | `/marketplace/dashboard` | Overview cards, sales pipeline, quick actions.
| Seller | `/marketplace/dashboard/orders|pos|listings` | Fulfilment controls, POS, catalogue management.

## Interface System
### Layout Grid
- Max width `1200px`, responsive gutters `16px` mobile → `32px` desktop.
- Sticky global nav with subdued glassmorphism, quick search, and dual CTAs (`Become a seller`, `Track order`).
- Dashboard surfaces adopt split 2/1 column with contextual side panels.

### Color & Tone
| Token | Value | Usage |
|-------|-------|-------|
| `--brand-primary` | `#045c47` | Buttons, highlights, gradient anchor.
| `--brand-secondary` | `#0f1f2b` | Dark surfaces, typography.
| `--brand-accent` | `#f6b756` | Metrics, badges, CTA outlines.
| `--brand-muted` | `#f4f5f7` | Section backgrounds.
| `--brand-positive` | `#2f9b63` | Success states.
| `--brand-info` | `#2770ef` | Informational chips.
| `--brand-danger` | `#c44c41` | Error messaging.

Typography: primary `Manrope` for headings (already loaded), `Inter` for body. Increase base font to `16px`, hero `64/48` weight 700. Rounded corners use `var(--radius-xl)` for hero/feature cards, `var(--radius-lg)` for cards & dialogs.

### Component Patterns
- **Marketplace Nav**: new `NavShell` with logo + tagline, persistent search, buyer/seller quick links, condensed mobile sheet.
- **Hero**: split layout with stats column (`Live listings`, `Orders fulfilled`, `Avg. seller rating`).
- **Category chips**: pill buttons with iconography, gradient border.
- **Listing cards**: price emphasis, seller avatar overlay, rating badge, hover elevate.
- **Cart drawer**: retains page route but highlights timeline summary and support CTA.
- **Checkout steps**: inline progress indicator, trust badges, payment summary.
- **Dashboard overview**: KPI row, `Actions` panel, `Sales pipeline` chart (existing data components reused with new styling).

### Interaction Notes
- Search field debounces and syncs with `listings` route query.
- `Add to cart` triggers toast + nav badge pulse.
- Merchant page surfaces `Message seller` CTA (ties into existing chats module) and `Report seller` anchored under support.
- POS and Orders adopt consistent `Hedgetech` brand header.

## Content Strategy
- Replace lorem copy with marketplace-specific copy focusing on trust, partnership, and fintech-grade reliability.
- Introduce microcopy for empty states (e.g., "No saved addresses yet – add one at checkout.").
- Ensure dynamic data fallback ensures realism when API is offline.

## Implementation Roadmap
1. **Brand foundation** – update theme tokens, favicon/meta, and create `HedgetechLogo` asset + React component.
2. **Global chrome** – replace nav/footer, update meta copy, align to new IA.
3. **Marketplace surfaces** – redesign landing hero, category rail, listings grid, listing detail, cart, checkout, orders.
4. **Seller tooling** – restyle dashboard overview, orders, listings management, POS, import wizard.
5. **Buyer support** – refresh order timeline, add trust/support CTAs, unify status chips.
6. **Validation** – run lint, targeted tests, and manual smoke of buyer/seller happy paths.

## Success Criteria
- Navigation and CTAs clearly differentiate buyer vs seller journeys.
- Marketplace pages feel cohesive with dashboards (shared palette + components).
- Branding assets updated across nav, favicon, README, and meta tags.
- No regression in data operations (cart, orders, listings remain functional).
