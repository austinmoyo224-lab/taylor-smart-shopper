
## Goal

There are currently two overlapping paths to become a retailer:

- `/onboarding` — legacy 5-step self-serve wizard that instantly creates an org + `retailer_admin` role (no review).
- `/store-onboarding` — new application form gated by admin approval at `/admin/onboarding`.

Two doors is confusing and undermines the approval workflow (a user could bypass review via `/onboarding`). Consolidate everything on the reviewed `/store-onboarding` flow.

## Changes

1. **Replace `src/routes/onboarding.tsx`** with a tiny redirect stub so old links (portal, emails, bookmarks) still work:
   - `beforeLoad: () => redirect({ to: "/store-onboarding" })`.
   - Keep `ssr: false` and `robots: noindex`.

2. **Delete `src/lib/onboarding.functions.ts`** — `startRetailerOnboarding` and `bulkImportProducts` are only used by the legacy wizard. Bulk product import belongs in the retailer portal (`/portal/products`) if we want it back later; not scope here.

3. **Update the two internal links** in the portal empty states to point directly at `/store-onboarding`:
   - `src/routes/portal.tsx` — the "No access yet" and "No organisation yet" screens (button label: "Apply to list your store").
   - `src/routes/portal.index.tsx` — the "No stores yet" hint on the dashboard.

4. **routeTree.gen.ts** regenerates automatically from file changes — no manual edits.

## Out of scope

- No DB changes. `store_onboarding_requests` and the admin approval flow stay as-is.
- No changes to `/auth`, `/admin/onboarding`, or the approval logic in `store-onboarding.functions.ts`.
- Bulk CSV product import is dropped for now; can be re-added inside `/portal/products` later.

## Files touched

- `src/routes/onboarding.tsx` — rewrite as redirect.
- `src/lib/onboarding.functions.ts` — delete.
- `src/routes/portal.tsx` — 2 link + copy tweaks.
- `src/routes/portal.index.tsx` — 1 link + copy tweak.
