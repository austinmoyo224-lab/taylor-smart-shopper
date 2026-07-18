import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyStoreOnboardingRequest,
  submitStoreOnboardingRequest,
} from "@/lib/store-onboarding.functions";
import { ArrowLeft, Check, Clock, X } from "lucide-react";

export const Route = createFileRoute("/store-onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "List your store — Taylor Intelligence" },
      {
        name: "description",
        content:
          "Apply to list your store on Taylor Intelligence. Reach South African shoppers with your promotions and coupons.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StoreOnboardingPage,
});

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const BUSINESS_TYPES = [
  { v: "independent", label: "Independent store" },
  { v: "retail_group", label: "Retail group / chain" },
  { v: "brand", label: "Brand" },
  { v: "partner", label: "Partner" },
] as const;

const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

function StoreOnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const existing = useQuery({
    queryKey: ["store-onboarding", "mine"],
    queryFn: () => getMyStoreOnboardingRequest(),
    enabled: !!user,
  });

  if (loading || existing.isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  const req = existing.data;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 pb-4 pt-8">
        <Link
          to="/stores"
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Home
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Store owner application
        </p>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        {req ? <StatusCard req={req} /> : <RequestForm onSubmitted={() => existing.refetch()} />}
      </main>
    </div>
  );
}

function StatusCard({ req }: { req: NonNullable<Awaited<ReturnType<typeof getMyStoreOnboardingRequest>>> }) {
  const icon =
    req.status === "approved" ? (
      <Check className="size-5" />
    ) : req.status === "rejected" ? (
      <X className="size-5" />
    ) : (
      <Clock className="size-5" />
    );

  const tone =
    req.status === "approved"
      ? "border-primary/30 bg-primary/5 text-primary"
      : req.status === "rejected"
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border-amber-400/30 bg-amber-400/5 text-amber-600";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div
        className={
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium " +
          tone
        }
      >
        {icon}
        <span className="capitalize">{req.status}</span>
      </div>
      <h2
        className="mt-3 text-2xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {req.business_name}
      </h2>
      <p className="text-sm text-muted">{req.store_name}</p>
      {req.status === "pending" && (
        <p className="mt-4 text-sm text-muted">
          Thanks for applying. Our team reviews new stores within 1–2 business days. You'll get an
          email once your store is approved.
        </p>
      )}
      {req.status === "approved" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted">
            Your store is live. Head to the retailer portal to add products, run promotions and
            print your QR poster.
          </p>
          <Link
            to="/portal"
            className="inline-flex rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
          >
            Open retailer portal
          </Link>
        </div>
      )}
      {req.status === "rejected" && req.admin_notes && (
        <p className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {req.admin_notes}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 text-xs">
        <Info label="Business type" value={req.business_type} />
        <Info label="Proposed URL" value={`/join/${req.proposed_slug}`} />
        <Info label="City" value={req.store_city} />
        <Info label="Contact email" value={req.business_email} />
      </dl>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value || "—"}</dd>
    </div>
  );
}

function RequestForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [businessName, setBusinessName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [businessType, setBusinessType] =
    useState<(typeof BUSINESS_TYPES)[number]["v"]>("independent");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#22c55e");
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useMemo(() => {
    if (!slugTouched) setSlug(slugify(businessName));
  }, [businessName, slugTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await submitStoreOnboardingRequest({
        data: {
          business_name: businessName,
          trading_name: tradingName,
          business_type: businessType,
          business_email: email,
          contact_phone: phone,
          proposed_slug: slug,
          store_name: storeName,
          store_address: address,
          store_city: city,
          store_province: province,
          trading_hours: {},
          logo_url: logoUrl,
          brand_color: brandColor,
          short_description: description,
        },
      });
      onSubmitted();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Your business
        </h2>
        <p className="mt-1 text-xs text-muted">Tell us who you are.</p>
        <div className="mt-4 space-y-3">
          <F label="Business name" value={businessName} onChange={setBusinessName} required />
          <F label="Trading name (optional)" value={tradingName} onChange={setTradingName} />
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">
              Business type
            </span>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
              className={inputCls}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t.v} value={t.v}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <F label="Business email" type="email" value={email} onChange={setEmail} />
          <F label="Contact phone" value={phone} onChange={setPhone} placeholder="+27 82 555 1234" />
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">
              URL slug
            </span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className={inputCls}
              placeholder="sunrise-grocers"
              required
            />
            <span className="mt-1 block text-[11px] text-muted">
              Used in your public link: /join/{slug || "your-slug"}
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          First store
        </h2>
        <p className="mt-1 text-xs text-muted">Where shoppers will find you.</p>
        <div className="mt-4 space-y-3">
          <F label="Store name" value={storeName} onChange={setStoreName} required />
          <F label="Street address" value={address} onChange={setAddress} />
          <div className="grid grid-cols-2 gap-3">
            <F label="City" value={city} onChange={setCity} />
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">
                Province
              </span>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className={inputCls}
              >
                <option value="">Select…</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Branding
        </h2>
        <p className="mt-1 text-xs text-muted">Make your store recognisable.</p>
        <div className="mt-4 space-y-3">
          <F label="Logo URL (optional)" value={logoUrl} onChange={setLogoUrl} placeholder="https://…" />
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">
              Brand color
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-border bg-background"
              />
              <input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className={inputCls}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">
              Short description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls + " min-h-[80px]"}
              placeholder="What makes your store special?"
              maxLength={500}
            />
          </label>
        </div>
      </section>

      {err && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !businessName || !storeName || !slug}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit application"}
      </button>
      <p className="text-center text-[11px] text-muted">
        We review applications within 1–2 business days.
      </p>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function F({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </label>
  );
}