# Taylor Intelligence — Full marketing website

Turn the single landing page into a proper multi-page, high-end marketing site with a
dropdown mega-menu, detailed service pages, and conversion paths for each audience
(shoppers, stores, delivery riders).

## Site structure

```text
/                     Home — hero, proof, audience split, feature highlights, CTA
/features             Everything Taylor does (overview hub)
  /features/chat            Taylor Chat — companion, memory, real-time
  /features/vision          Taylor Vision — pantry/fridge multi-photo scanning
  /features/lists           Smart lists, basket, price comparison
  /features/recipes         Recipes, AI recipe images, share, recipe-to-list
  /features/deals           Deals, coupons, loyalty & points
  /features/travel          Restaurants, reviews, road-trip and weather guidance
/for-shoppers         Shopper landing page + CTA to sign up
/for-stores           Retail operating system: catalogue/CSV, promotions,
                      campaigns, broadcasts, QR store profiles, orders, analytics
/for-riders           Delivery rider programme, verification, assigned orders
/pricing              Free for shoppers, store plans, rider (no cost)
/about                Story, mission, made-for-South-Africa
/contact              Contact details + enquiry form
/faq                  Common questions (shopper / store / rider tabs)
/legal/privacy        Privacy policy
/legal/terms          Terms of service
```

All existing app routes (`/chat`, `/stores`, `/lists`, `/portal`, `/rider`, `/admin`,
`/auth`, …) stay exactly as they are. Marketing pages use new paths only, so nothing
in the product breaks. Signed-in users still get redirected off `/` into the app.

## Navigation

A new shared marketing header and footer, used by every marketing page:

- Sticky glass header on navy, Taylor mark on the left.
- Desktop dropdown menus: **Product** (the six feature pages, laid out as a two-column
  mega-menu with icons and one-line descriptions), **Solutions** (Shoppers / Stores /
  Riders), plus flat links for Pricing, About, FAQ.
- Right side: "Sign in" + green "Get started" button.
- Mobile: full-screen slide-in menu with collapsible sections, safe-area aware.
- Footer: four link columns, contact, legal, copyright, social.

## Conversion design

Each page follows a repeatable high-end pattern: navy hero with a single clear promise,
a proof/benefit strip, 3–6 detailed capability blocks with alternating layout, a
"how it works" numbered sequence, an objection-handling FAQ block, and a closing CTA
band. Two CTAs everywhere — primary (Get started / List your store / Apply as rider)
and secondary (see how it works). Sticky mobile CTA bar on the audience pages.

Visual language stays on brand: deep navy `#0F1B3D`, Tria9 green, white/soft-mint
sections, oversized display type, generous whitespace, subtle framer-motion reveals on
scroll, rounded 3xl cards, soft shadows. No stock-AI gradients.

## Content

Service descriptions are written from what the product actually does today — chat with
memory, multi-photo vision scanning, recipe-to-list without measurements, live SA price
comparison from official retailer sites, coupons/loyalty, store portal with CSV
catalogue import, promotions, campaigns and broadcasts, QR store links, order
assignment to verified riders, and analytics. No invented statistics, testimonials or
customer logos — placeholders are left as clearly generic proof points until you supply
real numbers.

## Technical notes

- New `src/components/marketing/` folder: `MarketingLayout.tsx`, `SiteHeader.tsx`
  (with dropdown mega-menu), `SiteFooter.tsx`, plus reusable `Hero`, `Section`,
  `FeatureRow`, `StatStrip`, `FaqAccordion`, `CtaBand` blocks.
- Routes added under `src/routes/` following file-based routing
  (`features.tsx` layout + `features.index.tsx`, `features.chat.tsx`, …,
  `for-stores.tsx`, `pricing.tsx`, `legal.privacy.tsx`, etc.).
- Existing shadcn primitives (`navigation-menu`, `accordion`, `sheet`) reused where
  available; brand colours moved into semantic tokens in `src/styles.css` instead of
  the inline `NAVY` / `GREEN` constants currently in `index.tsx`.
- Each page gets its own `head()` with unique title, description, og:title,
  og:description, og:url and self-referencing canonical; JSON-LD `Organization` stays
  on root, `FAQPage` added on `/faq`, `BreadcrumbList` on feature detail pages.
- `public/sitemap.xml` updated to the real `https://heytaylor.co.za` domain and all new
  pages (it currently points at an outdated `taylor-companion-ai.lovable.app` domain).
- Contact form: submits to a server function that stores the enquiry and notifies
  admin — no third-party form service.

## Out of scope

No changes to the app itself, database schema, auth, or portal functionality beyond the
one new contact-enquiry table.