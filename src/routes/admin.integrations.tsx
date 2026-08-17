import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, MapPin, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  getMapsKeySettings,
  saveMapsKey,
  clearMapsKey,
  testMapsKey,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/integrations")({
  ssr: false,
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const settings = useQuery({
    queryKey: ["admin", "integrations", "maps"],
    queryFn: () => getMapsKeySettings(),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin", "integrations", "maps"] });

  const save = useMutation({
    mutationFn: (key: string) => saveMapsKey({ data: { apiKey: key } }),
    onSuccess: () => {
      toast.success("Your Google Maps key is now in use");
      setApiKey("");
      setTestResult(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: () => clearMapsKey(),
    onSuccess: () => {
      toast.success("Switched back to the managed key");
      setTestResult(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => testMapsKey(),
    onSuccess: (r) => {
      setTestResult(r.message);
      if (r.ok) toast.success("Connection OK");
      else toast.error("Connection failed");
    },
  });

  const s = settings.data;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-background px-6 py-6 md:px-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Admin</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Integrations
        </h1>
        <p className="mt-2 text-sm text-muted">
          Use your own provider credentials instead of the platform-managed ones.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        <section className="max-w-2xl rounded-3xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-medium">Google Maps Platform</h2>
              <p className="mt-1 text-sm text-muted">
                Powers restaurant search, ratings, reviews and road-trip routing. The
                managed key only works on Lovable preview domains — add your own key so
                Maps works on heytaylor.co.za.
              </p>

              <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                {settings.isLoading ? (
                  <span className="text-muted">Loading…</span>
                ) : s?.usingCustomKey ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" />
                    Using your own key
                    <code className="ml-1 rounded bg-muted/10 px-1.5 py-0.5 font-mono text-xs">
                      {s.maskedKey}
                    </code>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-muted">
                    <AlertTriangle className="size-4" />
                    Using the platform-managed key
                    {s?.managedKeyAvailable ? "" : " (not configured)"}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-muted">
                  {s?.usingCustomKey ? "Replace API key" : "Your Google Maps API key"}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      type="password"
                      autoComplete="off"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza…"
                      className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    disabled={apiKey.trim().length < 20 || save.isPending}
                    onClick={() => save.mutate(apiKey.trim())}
                    className="rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {save.isPending ? "Saving…" : "Save & use"}
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  Stored securely on the server and never exposed to the browser. Restrict
                  the key in Google Cloud to the Places API and Routes API.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => test.mutate()}
                  disabled={test.isPending}
                  className="rounded-full border border-border px-4 py-2 text-xs disabled:opacity-50"
                >
                  {test.isPending ? "Testing…" : "Test connection"}
                </button>
                {s?.usingCustomKey && (
                  <button
                    onClick={() => clear.mutate()}
                    disabled={clear.isPending}
                    className="rounded-full border border-border px-4 py-2 text-xs text-muted disabled:opacity-50"
                  >
                    Revert to managed key
                  </button>
                )}
              </div>

              {testResult && (
                <p className="mt-3 break-words rounded-2xl bg-muted/10 px-4 py-3 text-xs">
                  {testResult}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
