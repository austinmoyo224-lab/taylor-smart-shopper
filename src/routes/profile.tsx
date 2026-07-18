import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, BottomNav } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Settings2, Sparkles, ShieldCheck, Users, Gift, Camera, Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAdminStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profile - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Your preferences, favourite stores and the memories Taylor uses to personalise your experience.",
      },
    ],
  }),
  component: ProfileScreen,
});

type Profile = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  locale: string;
  country_code: string;
  currency_code: string;
  city: string | null;
  avatar_url: string | null;
  preferred_greeting: string | null;
  communication_style: string | null;
};

type Memory = {
  personal: Record<string, unknown>;
  shopping: Record<string, unknown>;
  food: Record<string, unknown>;
  lifestyle: Record<string, unknown>;
};

type HouseholdMember = { name: string; age: string; favourite_food: string };

const SA_LANGUAGES = [
  { value: "en-ZA", label: "English" },
  { value: "af-ZA", label: "Afrikaans" },
  { value: "zu-ZA", label: "isiZulu" },
  { value: "xh-ZA", label: "isiXhosa" },
  { value: "st-ZA", label: "Sesotho" },
  { value: "tn-ZA", label: "Setswana" },
  { value: "nso-ZA", label: "Sepedi" },
  { value: "ts-ZA", label: "Xitsonga" },
  { value: "ss-ZA", label: "siSwati" },
  { value: "ve-ZA", label: "Tshivenda" },
  { value: "nr-ZA", label: "isiNdebele" },
];

const SUPERMARKETS = [
  "Checkers", "Shoprite", "Pick n Pay", "Woolworths", "SPAR", "Food Lover's Market",
  "Makro", "Game", "OK Foods", "Boxer", "Cambridge Food", "Usave",
];

function ProfileScreen() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isWelcome =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("welcome");

  const adminStatus = useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => getAdminStatus(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) void navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, first_name, last_name, email, phone, locale, country_code, currency_code, city, avatar_url, preferred_greeting, communication_style",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("subscriber_memory")
          .select("personal, shopping, food, lifestyle")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (p) setProfile(p as Profile);
      if (m)
        setMemory({
          personal: (m.personal ?? {}) as Record<string, unknown>,
          shopping: (m.shopping ?? {}) as Record<string, unknown>,
          food: (m.food ?? {}) as Record<string, unknown>,
          lifestyle: (m.lifestyle ?? {}) as Record<string, unknown>,
        });
    })();
  }, [user]);

  async function save() {
    if (!user || !profile || !memory) return;
    setSaving(true);
    try {
      await Promise.all([
        supabase
          .from("profiles")
          .update({
            display_name: profile.display_name,
            first_name: profile.first_name,
            last_name: profile.last_name,
            city: profile.city,
            locale: profile.locale,
            avatar_url: profile.avatar_url,
            preferred_greeting: profile.preferred_greeting,
            communication_style: profile.communication_style,
            onboarding_completed: true,
          })
          .eq("id", user.id),
        supabase
          .from("subscriber_memory")
          .update({
            personal: memory.personal as never,
            shopping: memory.shopping as never,
            food: memory.food as never,
            lifestyle: memory.lifestyle as never,
          })
          .eq("user_id", user.id),
      ]);
      setSavedAt(Date.now());
      if (isWelcome) void navigate({ to: "/stores" });
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarPicked(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed?.signedUrl && profile) {
        setProfile({ ...profile, avatar_url: signed.signedUrl });
      }
    } finally {
      setUploading(false);
    }
  }

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="flex-1" />
        <BottomNav />
      </AppShell>
    );
  }

  if (!profile || !memory) {
    return (
      <AppShell>
        <header className="border-b border-border bg-background px-6 pb-4 pt-10">
          <h1
            className="text-3xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Profile
          </h1>
        </header>
        <main className="flex-1 px-6 py-8 text-sm text-muted">Loading…</main>
        <BottomNav />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative size-16 overflow-hidden rounded-full border border-border bg-card"
              aria-label="Upload profile picture"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-muted">
                  <Camera className="size-5" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px] text-white">
                {uploading ? "…" : "Edit"}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onAvatarPicked(f);
                e.target.value = "";
              }}
            />
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">You</p>
              <h1
                className="text-2xl italic tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {profile.display_name || profile.first_name || "Your profile"}
              </h1>
              <p className="mt-1 text-xs text-muted">{profile.email ?? profile.phone ?? ""}</p>
            </div>
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
          >
            <Settings2 className="size-4" />
          </Link>
        </div>
        {isWelcome && (
          <p className="mt-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
            Welcome to Taylor! Fill in a bit about you and your home so I can help you shop smarter.
          </p>
        )}
      </header>

      <main className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
        {adminStatus.data?.isSuperAdmin && (
          <Link
            to="/admin"
            className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Open admin console
            </span>
            <span aria-hidden>→</span>
          </Link>
        )}
        {adminStatus.data?.canClaim && (
          <Link
            to="/admin"
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Claim super admin (first run)
            </span>
            <span aria-hidden>→</span>
          </Link>
        )}

        <Link
          to="/portal"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
        >
          <span>Store portal</span>
          <span aria-hidden className="text-muted">
            →
          </span>
        </Link>

        <Link
          to="/household"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
        >
          <span className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            Household sharing
          </span>
          <span aria-hidden className="text-muted">
            →
          </span>
        </Link>

        <Link
          to="/loyalty"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
        >
          <span className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            Points & rewards
          </span>
          <span aria-hidden className="text-muted">
            →
          </span>
        </Link>

        <Section title="About you">
          <TextField
            label="Display name"
            value={profile.display_name ?? ""}
            onChange={(v) => setProfile({ ...profile, display_name: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="First name"
              value={profile.first_name ?? ""}
              onChange={(v) => setProfile({ ...profile, first_name: v })}
            />
            <TextField
              label="Last name"
              value={profile.last_name ?? ""}
              onChange={(v) => setProfile({ ...profile, last_name: v })}
            />
          </div>
          <TextField
            label="Location (city or area)"
            placeholder="e.g. Sandton, Johannesburg"
            value={profile.city ?? ""}
            onChange={(v) => setProfile({ ...profile, city: v })}
          />
          <SelectField
            label="Preferred language"
            value={profile.locale || "en-ZA"}
            options={SA_LANGUAGES}
            onChange={(v) => setProfile({ ...profile, locale: v })}
          />
          <TextField
            label="How should Taylor greet you?"
            placeholder="Howzit, morning, hello…"
            value={profile.preferred_greeting ?? ""}
            onChange={(v) => setProfile({ ...profile, preferred_greeting: v })}
          />
          <SelectField
            label="Conversation style"
            value={profile.communication_style ?? "warm"}
            options={[
              { value: "warm", label: "Warm and chatty" },
              { value: "concise", label: "Concise" },
              { value: "playful", label: "Playful" },
            ]}
            onChange={(v) => setProfile({ ...profile, communication_style: v })}
          />
        </Section>

        <HouseholdSection memory={memory} setMemory={setMemory} />
        <ShoppingSection memory={memory} setMemory={setMemory} />

        <MemorySection
          title="Food & diet"
          description="Allergies, preferences and cuisines. Never shared outside Taylor."
          value={memory.food}
          onChange={(v) => setMemory({ ...memory, food: v })}
          fields={[
            { key: "allergies", label: "Allergies", type: "text" },
            { key: "dietary", label: "Dietary preferences (halal, vegetarian…)", type: "text" },
            { key: "loved_cuisines", label: "Cuisines you love", type: "text" },
            { key: "disliked", label: "Foods to avoid", type: "text" },
          ]}
        />

        <MemorySection
          title="Lifestyle"
          description="Life moments Taylor should remember. Fully opt-in."
          value={memory.lifestyle}
          onChange={(v) => setMemory({ ...memory, lifestyle: v })}
          fields={[
            { key: "cooking_time", label: "Time you have for cooking on weeknights", type: "text" },
            { key: "kids_ages", label: "Kids in the home (ages)", type: "text" },
            { key: "notes", label: "Anything else Taylor should know", type: "textarea" },
          ]}
        />

        <div className="sticky bottom-20 z-10 -mx-6 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <button
            onClick={save}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {saving ? "Saving…" : "Save profile"}
          </button>
          {savedAt && (
            <p className="mt-2 text-center text-[10px] text-muted">
              Saved just now. Taylor will use this from your next message.
            </p>
          )}
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/auth" });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-xs text-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </main>

      <BottomNav />
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function TextField({
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
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MemorySection({
  title,
  description,
  value,
  onChange,
  fields,
}: {
  title: string;
  description: string;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  fields: { key: string; label: string; type: "text" | "number" | "textarea" }[];
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card/40 p-4">
      <div>
        <h2 className="text-lg italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-snug text-muted">{description}</p>
      </div>
      {fields.map((f) => {
        const v = (value[f.key] as string | number | undefined) ?? "";
        return (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted">{f.label}</span>
            {f.type === "textarea" ? (
              <textarea
                value={String(v)}
                onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            ) : (
              <input
                type={f.type}
                value={String(v)}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    ...value,
                    [f.key]: f.type === "number" ? (raw === "" ? "" : Number(raw)) : raw,
                  });
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            )}
          </label>
        );
      })}
    </section>
  );
}
