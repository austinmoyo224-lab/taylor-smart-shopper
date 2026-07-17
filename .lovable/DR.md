# Disaster Recovery Notes — Taylor Intelligence

## Data

- Primary datastore: Lovable Cloud (managed Postgres). Automatic daily backups retained by the platform.
- Point-in-time restore: available via Lovable Cloud dashboard within retention window.
- All schema changes ship as versioned migrations under `supabase/migrations/` — replaying them on a fresh project reconstructs the app.

## Secrets

- `LOVABLE_API_KEY` — AI Gateway. Rotate via project secrets; no downtime, next request picks up the new value.
- Supabase publishable / anon keys are safe in the client. Service role key never leaves the server bundle.

## Restore drill

1. Provision a fresh Lovable Cloud project.
2. Re-run all migrations in order (`supabase/migrations/*.sql`).
3. Restore data from the latest backup snapshot.
4. Re-add secrets: `LOVABLE_API_KEY`.
5. Redeploy the app. Smoke-test: `/chat` sends a message, `/auth` signs in, `/portal` loads for a retailer admin.

## Rate limiting

- In-memory per-Worker limiter on `/api/chat`: 30 req/min authenticated, 10 req/min anonymous.
- Best-effort only (isolate-local). For production scale, back with Durable Objects or a KV counter.

## Monitoring

- Errors surface via `reportLovableError` → root ErrorBoundary.
- AI Gateway request logs available via `ai_gateway_logs` tool.
- DB logs via `supabase--analytics_query`.
