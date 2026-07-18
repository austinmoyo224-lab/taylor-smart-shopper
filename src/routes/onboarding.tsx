import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useAuth } from "@/hooks/useAuth";
import { getPortalContext, createStore, createProduct, createPromotion } from "@/lib/portal.functions";
import { startRetailerOnboarding, bulkImportProducts } from "@/lib/onboarding.functions";
import { ensureStoreQrCode } from "@/lib/subscriptions.functions";
import { ArrowLeft, ArrowRight, Check, Download, Upload } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Retailer onboarding — Taylor Intelligence" },
      {
        name: "description",
        content:
          "Set up your organisation, first store, product catalogue, first promotion and print your QR poster.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OnboardingPage,
});

type Step = 0 | 1 | 2 | 3 | 4;
const stepLabels = ["Organisation", "First store", "Products", "First promotion", "QR poster"];

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["portal", "context"],
    queryFn: () => getPortalContext(),
    enabled: !!user,
  });

  const existingOrg = ctx?.hasAccess ? ctx.organisations[0] : undefined;

  const [step, setStep] = useState<Step>(0);
  const [orgId, setOrgId] = useState<string | undefined>(existingOrg?.id);
  const [storeId, setStoreId] = useState<string | undefined>();
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [productCount, setProductCount] = useState(0);
  const [promoOk, setPromoOk] = useState(false);

  useEffect(() => {
    if (existingOrg && !orgId) {
      setOrgId(existingOrg.id);
      setStep(1);
    }
  }, [existingOrg, orgId]);

  if (loading || isLoading || !user)
    return <Center>Loading onboarding…</Center>;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pb-4 pt-8">
        <Link
          to={ctx?.hasAccess ? "/portal" : "/chat"}
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {ctx?.hasAccess ? "Portal" : "Home"}
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Retailer onboarding
        </p>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24">
        <Stepper step={step} />

        {step === 0 && (
          <OrgStep
            onDone={(id) => {
              setOrgId(id);
              void qc.invalidateQueries({ queryKey: ["portal", "context"] });
              setStep(1);
            }}
          />
        )}
        {step === 1 && orgId && (
          <StoreStep
            orgId={orgId}
            onDone={(id, slug) => {
              setStoreId(id);
              setStoreSlug(slug);
              void qc.invalidateQueries({ queryKey: ["portal", "context"] });
              setStep(2);
            }}
          />
        )}
        {step === 2 && orgId && (
          <ProductsStep
            orgId={orgId}
            onDone={(count) => {
              setProductCount(count);
              setStep(3);
            }}
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && orgId && (
          <PromotionStep
            orgId={orgId}
            storeId={storeId}
            onDone={() => {
              setPromoOk(true);
              setStep(4);
            }}
            onSkip={() => setStep(4)}
          />
        )}
        {step === 4 && storeId && (
          <QrStep
            storeId={storeId}
            storeSlug={storeSlug}
            productCount={productCount}
            promoOk={promoOk}
          />
        )}
        {step === 4 && !storeId && (
          <Card>
            <p className="text-sm text-muted">Onboarding complete.</p>
            <Link
              to="/portal"
              className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
            >
              Open portal
            </Link>
          </Card>
        )}
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">
      {children}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
      {stepLabels.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "flex size-6 items-center justify-center rounded-full border " +
                (done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-border text-muted")
              }
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={active ? "text-foreground" : "text-muted"}>{label}</span>
            {i < stepLabels.length - 1 && <span className="text-muted">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">{children}</div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function OrgStep({ onDone }: { onDone: (id: string) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"retail_group" | "brand" | "partner" | "independent">(
    "independent",
  );
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const slugTouched = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await startRetailerOnboarding({
        data: {
          name,
          slug,
          type,
          country_code: "ZA",
          default_currency: "ZAR",
          contact_email: email,
        },
      });
      onDone(res.organisationId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2
        className="text-2xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Tell us about your business
      </h2>
      <p className="mt-1 text-sm text-muted">
        This creates your organisation on Taylor. You'll be its retailer admin.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Business name">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched.current) setSlug(slugify(e.target.value));
            }}
            placeholder="Sunrise Grocers"
            required
          />
        </Field>
        <Field label="URL slug" hint="Used in links like /join/your-slug — lowercase, no spaces.">
          <input
            className={inputCls}
            value={slug}
            onChange={(e) => {
              slugTouched.current = true;
              setSlug(slugify(e.target.value));
            }}
            placeholder="sunrise-grocers"
            required
          />
        </Field>
        <Field label="Business type">
          <select
            className={inputCls}
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="independent">Independent retailer</option>
            <option value="retail_group">Retail group</option>
            <option value="brand">Brand</option>
            <option value="partner">Partner</option>
          </select>
        </Field>
        <Field label="Contact email (optional)">
          <input
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@sunrise.co.za"
          />
        </Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={busy || !name || !slug}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Creating…" : "Continue"}
          <ArrowRight className="size-4" />
        </button>
      </form>
    </Card>
  );
}

function StoreStep({
  orgId,
  onDone,
}: {
  orgId: string;
  onDone: (id: string, slug: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const slugTouched = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await createStore({
        data: {
          organisation_id: orgId,
          name,
          slug,
          city,
          country_code: "ZA",
          status: "pending",
        },
      });
      onDone(res.id, slug);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-2xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Add your first store
      </h2>
      <p className="mt-1 text-sm text-muted">
        Shoppers follow stores to see your promotions and coupons.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Store name">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched.current) setSlug(slugify(e.target.value));
            }}
            placeholder="Sunrise Sea Point"
            required
          />
        </Field>
        <Field label="Store slug" hint="Used for the QR poster URL.">
          <input
            className={inputCls}
            value={slug}
            onChange={(e) => {
              slugTouched.current = true;
              setSlug(slugify(e.target.value));
            }}
            required
          />
        </Field>
        <Field label="City">
          <input
            className={inputCls}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cape Town"
          />
        </Field>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={busy || !name || !slug}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Creating…" : "Continue"}
          <ArrowRight className="size-4" />
        </button>
      </form>
    </Card>
  );
}

type CsvProduct = {
  name: string;
  slug: string;
  sku?: string;
  unit?: string;
  unit_amount?: number | null;
  base_price?: number | null;
  currency_code: string;
};

function parseCsv(text: string): { rows: CsvProduct[]; errors: string[] } {
  const errors: string[] = [];
  const rows: CsvProduct[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { rows, errors: ["Empty file"] };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const nameI = idx("name");
  if (nameI === -1) return { rows, errors: ["CSV must have a 'name' column"] };
  const priceI = idx("price");
  const unitI = idx("unit");
  const unitAmtI = idx("unit_amount");
  const skuI = idx("sku");

  for (let i = 1; i < lines.length && rows.length < 200; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameI];
    if (!name) continue;
    const priceRaw = priceI >= 0 ? cols[priceI] : "";
    const unitAmtRaw = unitAmtI >= 0 ? cols[unitAmtI] : "";
    const price = priceRaw ? Number(priceRaw) : null;
    const unitAmt = unitAmtRaw ? Number(unitAmtRaw) : null;
    if (priceRaw && Number.isNaN(price!)) {
      errors.push(`Row ${i + 1}: invalid price "${priceRaw}"`);
      continue;
    }
    rows.push({
      name,
      slug: slugify(name) + "-" + Math.random().toString(36).slice(2, 6),
      sku: skuI >= 0 ? cols[skuI] : undefined,
      unit: unitI >= 0 ? cols[unitI] : undefined,
      unit_amount: unitAmt ?? null,
      base_price: price ?? null,
      currency_code: "ZAR",
    });
  }
  return { rows, errors };
}

function ProductsStep({
  orgId,
  onDone,
  onSkip,
}: {
  orgId: string;
  onDone: (count: number) => void;
  onSkip: () => void;
}) {
  const [parsed, setParsed] = useState<CsvProduct[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const { rows, errors } = parseCsv(text);
    setParsed(rows);
    setErrors(errors);
  }

  function addManual() {
    if (!manualName.trim()) return;
    setParsed((p) => [
      ...p,
      {
        name: manualName.trim(),
        slug: slugify(manualName) + "-" + Math.random().toString(36).slice(2, 6),
        base_price: manualPrice ? Number(manualPrice) : null,
        currency_code: "ZAR",
      },
    ]);
    setManualName("");
    setManualPrice("");
  }

  async function submit() {
    if (parsed.length === 0) return;
    setBusy(true);
    setSubmitErr(null);
    try {
      const res = await bulkImportProducts({
        data: { organisation_id: orgId, products: parsed },
      });
      onDone(res.count);
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const sample =
    "name,price,unit,unit_amount,sku\nWhole wheat bread,24.99,g,700,BR-001\nFresh milk,32.50,ml,1000,ML-002\n";

  function downloadSample() {
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taylor-products-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <h2 className="text-2xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Add your products
      </h2>
      <p className="mt-1 text-sm text-muted">
        Upload a CSV, or add a few by hand. You can always add more later.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs hover:border-primary">
          <Upload className="size-3.5" />
          Upload CSV
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </label>
        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs hover:border-primary"
        >
          <Download className="size-3.5" />
          Sample CSV
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
        <input
          className={inputCls}
          placeholder="Product name"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Price (ZAR)"
          type="number"
          step="0.01"
          value={manualPrice}
          onChange={(e) => setManualPrice(e.target.value)}
        />
        <button
          type="button"
          onClick={addManual}
          className="rounded-full border border-border px-4 py-2 text-xs hover:border-primary"
        >
          Add
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-destructive">
          {errors.slice(0, 5).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {parsed.length > 0 && (
        <div className="mt-6 max-h-64 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/30 text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-left">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parsed.map((p, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {p.base_price != null ? `R ${p.base_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {p.unit_amount && p.unit ? `${p.unit_amount} ${p.unit}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {submitErr && <p className="mt-4 text-sm text-destructive">{submitErr}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || parsed.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Importing…" : `Import ${parsed.length || ""} product${parsed.length === 1 ? "" : "s"}`}
          <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted hover:text-foreground"
        >
          Skip for now →
        </button>
      </div>
    </Card>
  );
}

function PromotionStep({
  orgId,
  storeId,
  onDone,
  onSkip,
}: {
  orgId: string;
  storeId?: string;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [title, setTitle] = useState("Grand opening special");
  const [original, setOriginal] = useState("");
  const [sale, setSale] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await createPromotion({
        data: {
          organisation_id: orgId,
          store_id: storeId ?? null,
          title,
          description: "",
          type: "weekly_special",
          is_sponsored: false,
          original_price: original ? Number(original) : null,
          sale_price: sale ? Number(sale) : null,
          currency_code: "ZAR",
          starts_at: "",
          ends_at: "",
          is_published: true,
        },
      });
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not create promotion");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-2xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Launch your first promotion
      </h2>
      <p className="mt-1 text-sm text-muted">
        Taylor will surface this to shoppers who follow your store.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Title">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Original price (ZAR)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
            />
          </Field>
          <Field label="Sale price (ZAR)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={sale}
              onChange={(e) => setSale(e.target.value)}
            />
          </Field>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !title}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish & continue"}
            <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted hover:text-foreground"
          >
            Skip for now →
          </button>
        </div>
      </form>
    </Card>
  );
}

function QrStep({
  storeId,
  storeSlug,
  productCount,
  promoOk,
}: {
  storeId: string;
  storeSlug: string;
  productCount: number;
  promoOk: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [slug, setSlug] = useState(storeSlug);
  const [err, setErr] = useState<string | null>(null);

  const joinUrl = useMemo(
    () => (slug ? `${window.location.origin}/join/${slug}` : ""),
    [slug],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const r = await ensureStoreQrCode({ data: { storeId } });
        if (cancelled) return;
        setSlug(r.slug);
        const url = `${window.location.origin}/join/${r.slug}`;
        const png = await QRCode.toDataURL(url, {
          width: 480,
          margin: 1,
          color: { dark: "#0F1B3D", light: "#ffffff" },
        });
        if (!cancelled) setDataUrl(png);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not generate QR");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return (
    <Card>
      <h2 className="text-2xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        You're live 🎉
      </h2>
      <p className="mt-1 text-sm text-muted">
        Print or share this QR so shoppers can follow your store and get personalised deals from
        Taylor.
      </p>

      <ul className="mt-4 space-y-1 text-sm">
        <li className="flex items-center gap-2">
          <Check className="size-4 text-primary" /> Organisation created
        </li>
        <li className="flex items-center gap-2">
          <Check className="size-4 text-primary" /> Store created
        </li>
        {productCount > 0 && (
          <li className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> {productCount} product
            {productCount === 1 ? "" : "s"} imported
          </li>
        )}
        {promoOk && (
          <li className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> First promotion published
          </li>
        )}
      </ul>

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="rounded-2xl border border-border bg-white p-4">
          {dataUrl ? (
            <img src={dataUrl} alt="Store QR code" width={240} height={240} />
          ) : (
            <div className="grid size-60 place-items-center text-xs text-muted">
              {err ?? "Generating…"}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Join URL</p>
            <p className="mt-1 break-all font-mono text-xs">{joinUrl || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {dataUrl && (
              <a
                href={dataUrl}
                download={`taylor-qr-${slug}.png`}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs hover:border-primary"
              >
                <Download className="size-3.5" />
                Download PNG
              </a>
            )}
            <Link
              to="/portal"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
            >
              Open portal
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}