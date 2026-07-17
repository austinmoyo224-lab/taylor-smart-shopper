
# Taylor Intelligence — Master Build Plan

Enterprise multi-tenant AI Retail Engagement Platform. Phases 1–3 only. WhatsApp, native mobile, Taylor Vision, Household Sharing excluded from MVP but reserved in the schema.

**Stack (locked):** TanStack Start (React + TS), Tailwind, Lovable Cloud (Supabase: Postgres, Auth, RLS, Storage, Realtime, Edge, Triggers), Lovable AI Gateway for Taylor (default model `openai/gpt-5.5`), PWA delivery for the consumer app.

**Defaults:** South Africa first — ZAR, en-ZA, `Africa/Johannesburg` — but every schema is multi-country / multi-currency / multi-language ready (currency codes, country codes, translation tables).

**Execution model:** One master plan (this document). I build **milestone by milestone**, each milestone is a shippable slice you can review and approve before I start the next. I will not code Milestones 2+ until you approve what shipped in Milestone 1.

---

## Milestones (order of build)

```text
M1  Database foundation + Consumer PWA shell + Taylor chat stub  ← starts now
M2  Authentication (email, mobile, Google) + Subscriber profile & memory
M3  Admin Portal (super-admin over all tenants)
M4  Store Portal (retailer workspace: products, promotions, coupons, catalogues)
M5  QR codes, invitation links, subscription flow (store ↔ subscriber)
M6  Campaigns + Push Notifications engine (PWA push, preferences, delivery log)
M7  Taylor Intelligence Engine (TIE): personality, memory, decision engine, Life Moments
M8  Recipes, Shopping Lists, Pantry, AI meal/weather intelligence
M9  Analytics dashboards (admin + store) + Audit logs hardening
M10 Production hardening: rate limiting, disaster recovery notes, SEO, PWA install polish
```

Future modules (Vision, Household, WhatsApp, native, POS/ERP, payments, loyalty, marketplace) get **reserved tables and extension points** in M1 — no code, no UI.

---

## Milestone 1 — Detailed scope (what I build now)

### 1. Enable Lovable Cloud
Turn on Cloud so migrations, RLS, Storage, Auth, and Edge become available.

### 2. Database foundation (SQL migrations)
Production-grade, multi-tenant, RLS-first. Every table gets: `id uuid pk`, `tenant_id` where applicable, `created_at`, `updated_at`, `deleted_at` (soft delete), audit trigger, RLS enabled, GRANTs to `authenticated` / `service_role` (+ `anon` only on public-read tables).

Core tables created in M1:

```text
Tenancy & org
  organisations           retail groups / brands / partners / independents
  stores                  profile, GPS, hours, branding, status, qr_slug
  store_departments
  store_staff             (role FKs to user_roles)

Identity & roles
  profiles                one row per auth.users; name, locale, country, currency
  user_roles              enum app_role: super_admin, retailer_admin,
                          store_manager, staff, subscriber
  has_role(uuid,app_role) security-definer helper

Catalog
  brands
  product_categories      (self-referencing tree)
  products                sku, barcode, nutrition jsonb, images[], units,
                          pricing, availability, tenant scoped
  product_prices          historical
  product_inventory

Promotions & coupons (schema stub in M1, UI in M4)
  promotions              type enum, rules jsonb, audience jsonb, window
  coupons                 code, qr_payload, limits, expiry
  catalogues              flyers/monthly, products[], promotions[]

Subscriber side
  subscribers             = profile with role=subscriber; preferences jsonb,
                          languages[], notification_prefs jsonb
  subscriber_store_subs   many-to-many follow: store/department/brand/category
  subscriber_memory       structured memory (personal, shopping, food,
                          lifestyle, conversation) — feeds TIE in M7
  life_moments            birthdays, anniversaries, school terms, festive
                          (opt-in only)

Conversations (Taylor chat)
  conversations           thread per subscriber (title, last_msg_at)
  messages                role, parts jsonb, voice/image/receipt metadata,
                          run_id (AI gateway correlation)

Notifications (schema only in M1)
  notifications           payload, channel, status, delivered_at, read_at
  notification_prefs      per-subscriber per-category toggles

QR & campaigns (schema only in M1)
  qr_codes                type enum (store/campaign/promotion/invite),
                          target_id, scans, conversions
  campaigns               scope, audience, schedule

Recipes / lists / pantry (schema only in M1)
  recipes, recipe_ingredients
  shopping_lists, shopping_list_items
  pantry_items

Ops
  audit_log               (append-only trigger from every mutation)
  translations            (i18n key/locale/value)
  currencies, countries, languages  seed tables
```

Also created: RLS policies (tenant isolation via `organisation_id`, subscriber-owns-own-data), triggers (`updated_at`, audit, soft-delete guard, auto-create `profiles` + `subscriber_memory` on signup), views (`v_store_public`, `v_subscriber_dashboard`), and seed data (ZA country/currency/language, sample product categories).

**Reserved for future (empty tables with FKs so no redesign later):** `households`, `household_members`, `vision_scans`, `whatsapp_bindings`, `pos_syncs`, `loyalty_accounts`, `payments`.

### 3. Consumer PWA shell
Installable PWA (manifest + icons, no service worker yet per PWA skill — offline comes later if you ask). Routes:

```text
/                → redirects to /chat  (chat is default landing)
/chat            → Taylor chat (streaming, message.parts)
/stores          → placeholder list (M4 fills it)
/deals           → placeholder
/recipes         → placeholder
/lists           → placeholder
/coupons         → placeholder
/notifications   → placeholder
/profile         → placeholder
/settings        → placeholder
/auth            → placeholder (real auth in M2)
```

Bottom-tab mobile nav, premium look (dark warm neutral + one signature accent — I will run a **design--create_directions** prototype question at the start of M1 build so you approve the visual direction before I commit tokens).

### 4. Taylor chat stub (real AI, stub personality)
- Server route `src/routes/api/chat.ts` — streaming via AI SDK + Lovable AI Gateway helper (`openai/gpt-5.5`).
- System prompt embeds a **minimal Taylor persona** (warm, South African, never generic, never invents prices). The full TIE — memory retrieval, decision engine, Life Moments, sponsored labelling — lands in **M7**.
- Anonymous chat allowed in M1 (no auth yet); once M2 ships, messages persist to `conversations`/`messages` per subscriber.
- Zero hardcoded promo/product data in Taylor's replies. Until M4 populates real data, Taylor honestly says she doesn't have stores connected yet.

### 5. Head metadata + SEO
Real title/description on `__root` ("Taylor Intelligence — Your AI shopping companion"), og/twitter tags, no placeholder text remaining.

### 6. Out of scope for M1 (explicit)
Auth flows, admin/store portals, real promotions, QR generation, push notifications, recipes UI, analytics, TIE memory retrieval, payments. All present as **schema** only.

---

## Cross-cutting rules applied throughout

- **Multi-tenant isolation via RLS**, never via app filters.
- **Roles in `user_roles` table only**, never on `profiles`. `has_role()` security-definer.
- **Never store SERVICE_ROLE key client-side.** Admin ops go through `createServerFn` + `requireSupabaseAuth` + role check.
- **API-first:** every module exposes typed server functions; server routes reserved for webhooks/public APIs under `/api/public/*`.
- **Soft delete + audit** on every mutable table.
- **Taylor is honest:** never invents prices, always labels sponsored content, always explains recommendations.
- **Life Moments and health data are strictly opt-in** and stored encrypted-at-rest in `subscriber_memory` with per-field consent flags.
- **i18n from day one:** all user-visible strings routed through `translations`; ZA locales seeded, others addable without migration.

---

## What you get at the end of M1
A working preview where:
1. The PWA opens on `/chat`.
2. You can talk to Taylor (real Lovable AI, streaming).
3. The full production DB schema is live in Cloud, with RLS, audit, triggers, and seed reference data.
4. The visual design direction is locked (approved via prototype question).
5. Every subsequent milestone plugs into existing tables — no schema rework.

Approve this plan and I'll start M1: enable Cloud, run the design direction question, then ship migrations + PWA shell + Taylor chat in one build pass.

---

## Progress log

- **M1** shipped: DB schema, PWA shell, Taylor chat stub with streaming.
- **M2** shipped: email/phone/Google auth, profile & memory UI, conversation persistence.
- **M3** shipped: super-admin console (`/admin`) with orgs/stores/users/audit and bootstrap claim.
- **M4** shipped: retailer `/portal` (stores, products, promotions, coupons).
- **M5** shipped: QR generation, `/join/:slug`, follow/unfollow.
- **M6** shipped: campaigns + in-app notifications with prefs.
- **M7** shipped: Taylor Intelligence Engine — context-aware system prompt.
- **M8** shipped: Recipes (public), Shopping Lists (CRUD + items), Pantry (CRUD + expiry), BottomNav updated to expose Lists.
- **M9** in place: admin dashboard shows org/store/subscriber/promotion/conversation/message counts.
- **M10** shipped: `/api/chat` rate limiter (30/min auth, 10/min anon), PWA install prompt component in `AppShell`, `robots.txt` + `sitemap.xml`, DR runbook at `.lovable/DR.md`.
