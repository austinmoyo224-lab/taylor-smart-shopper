# Plan — Loyalty & Points (Phase 2 module)

**Status: shipped**

Give each retailer a per-org points ledger, a rewards catalogue, and one-tap
redemption for shoppers.

## What we shipped

- Migration: `loyalty_transactions` ledger, `rewards` catalogue,
  `reward_redemptions` log, plus a `private.award_loyalty_points` helper.
  RLS scopes reads to the shopper for their own rows and to retailer_admin /
  store_manager for their org; only server code writes to the ledger.
- Server functions in `src/lib/loyalty.functions.ts`:
  `getMyLoyalty`, `listRewardsForOrg`, `redeemReward`, `listMyRedemptions`
  (shopper); `listOrgRewards`, `upsertReward`, `deleteReward`,
  `awardPointsToUser`, `listOrgLoyaltyLedger` (retailer). Points are
  credited/debited through a shared `awardPoints` helper using the service
  role.
- `/loyalty` shopper route: per-org balance cards, rewards grid, redemption
  codes and recent activity.
- `/portal/rewards` retailer route: catalogue CRUD, manual award-points form
  (lookup by email or phone), and org-wide ledger view. Wired into the portal
  sidebar.
- Profile links shoppers to Points & rewards.

## Previously shipped (Household Sharing)

Let subscribers share shopping lists and pantry with the people they live with.

## What we shipped

- Migration: `household_id` on `shopping_lists` and `pantry_items`; new `household_invites` table with codes and 14-day expiry; `is_household_member` security-definer helper; RLS updated so household members can view/edit shared lists, list items, and pantry items while personal rows remain owner-only.
- Server functions in `src/lib/households.functions.ts`: list/create household, view detail, create/accept invite, leave, remove member, share list, share/unshare pantry.
- `/household` route with member list, invite codes (copy to clipboard), pantry sharing toggle, and multi-household switcher.
- Profile screen links to Household sharing.

## Previously shipped (Store Analytics v2)

Kept: `getStoreAnalytics`, `/portal/analytics`, tightened coupons SELECT policy.

Give retailers a real dashboard: follower growth, coupon redemptions, live promotions and active campaigns, filterable by store and time range.

## What we shipped

- `getStoreAnalytics` server function (`src/lib/portal.functions.ts`) — authenticated, org-scoped, with optional `store_id` filter and 7/30/90 day windows. Aggregates from `subscriber_store_subs`, `coupon_redemptions`, `promotions`, `campaigns`.
- `/portal/analytics` route with KPI tiles, follower growth area chart, daily redemptions bar chart (recharts), and a top-5 coupons table.
- Store portal nav entry "Analytics" between Dashboard and Stores.
- Tightened the coupons SELECT policy so only shoppers who actually follow the store (or a store in the same org for org-wide coupons) can read a coupon's `qr_payload`.

## Out of scope

- CSV export, cohort retention, funnel from view → redemption (needs an impression/view event table).
- Sponsored-brand ROI (needs a spend field on campaigns).

Build a camera-first feature that lets subscribers snap their fridge, pantry, or shopping receipt, then have Taylor identify items, match them to real store products, and add them to a shopping list or pantry.

## Goals

- Reduce manual typing in lists and pantry.
- Keep Taylor honest: only prices from the real `products` table; no invented deals.
- Preserve privacy: vision images live in a private per-user storage bucket.
- Ship as one shippable milestone that plugs into the existing M1–M10 foundation.

## What we build

### 1. Storage foundation

- Create a private Supabase Storage bucket `vision-uploads`.
- Add RLS policies on `storage.objects` so authenticated users can read/write only objects under their own `user_id/` prefix.
- No new database tables: reuse the reserved `vision_scans` table (`image_url`, `detected` JSONB, `user_id`, `created_at`). Store the storage path and AI results inside `detected`.

### 2. Camera capture component

- New client component `src/components/VisionCapture.tsx`.
- Use `navigator.mediaDevices.getUserMedia` for live preview with a fallback to `<input type="file" accept="image/*" capture>` on older devices.
- Resize captured image on a canvas to ~1024px wide, JPEG quality 0.8, to control upload size and AI cost.
- Upload to `vision-uploads/<user_id>/<uuid>.jpg` via the Supabase client.

### 3. Vision analysis server function

- New `src/lib/vision.functions.ts` with `analyzeVisionScan`.
- Server signs the stored image and sends it to Lovable AI Gateway (`openai/gpt-5.5`) with a structured-output prompt.
- Prompt asks for a list of detected items: `name`, `quantity`, `unit`, `category`, `confidence`, `brand` (if visible), `estimated_expiry_days`.
- After extraction, fuzzy-match each item name against `products.name` using the existing `pg_trgm` extension (`similarity()`), returning only real matches with actual `base_price`.
- Insert a `vision_scans` row with the signed image URL, detected items, and matched products.
- Apply a dedicated rate limit: 30 analyses/hour per authenticated user, 5/hour anonymous.

### 4. `/vision` scan route

- New route `src/routes/vision.tsx`.
- Authenticated-only (redirect to `/auth` if not signed in).
- Three states: camera capture → analysing spinner → results.
- Results screen shows detected item cards with confidence badges and matched product prices where available.
- Actions per item / bulk:
  - **Add to pantry** (uses existing `addPantryItem`, pre-fills name and expiry from estimated expiry days).
  - **Add to shopping list** (select existing list or create new, uses existing list functions).
  - **Find recipes** (pass detected items to a new `suggestRecipesFromItems` server function that queries `recipes` by ingredient names).
- History list of recent scans below the camera area.

### 5. Chat vision integration

- Wire the currently inactive **Plus/attach** button in `src/routes/chat.tsx` to open the camera/gallery picker.
- Allow sending an image message through `/api/chat`.
- Update `src/routes/api/chat.ts` to accept image content parts, convert them with `convertToModelMessages`, and stream a vision-aware response from Taylor.
- Taylor can describe what she sees and suggest adding items to pantry/list; actual add action happens from the `/vision` results screen to keep the chat flow simple.

### 6. Navigation & discoverability

- Add a "Scan" shortcut in the chat composer (Plus icon) and a link from `/pantry` and `/lists` headers ("Scan to add").
- Keep the BottomNav at 5 tabs to avoid crowding; Vision is reachable from chat and pantry/lists, plus direct `/vision` URL.

### 7. Rate limiting & trust guardrails

- Reuse `src/lib/rate-limit.server.ts` for the new `analyzeVisionScan` endpoint.
- Vision analysis counts against a separate, stricter bucket than chat.
- Hard rule in prompts: "Only quote prices when a matched product row with a real `base_price` is provided. If no match, say so."

## Out of scope for this milestone

- Live barcode/QR scanning within the camera stream (reserved for a later native/PWA enhancement).
- Receipt total extraction / price parsing from image text.
- Household-shared scans (households table exists but not wired yet).
- WhatsApp image input.

## Deliverables at the end

1. Subscribers can snap a photo from chat or `/vision`.
2. Taylor identifies items and, where possible, matches them to real products with real prices.
3. One-tap add to pantry or shopping list.
4. Scan history persists in `vision_scans`.
5. Rate limits and private storage keep the feature safe and fair.

## Approval needed

Approve this plan and I'll start building: storage bucket + RLS, camera component, vision analysis function, `/vision` route, and chat image support.
