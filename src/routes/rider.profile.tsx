import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { getMyRiderProfile, upsertMyRiderProfile } from "@/lib/rider.functions";

export const Route = createFileRoute("/rider/profile")({
  ssr: false,
  component: RiderProfilePage,
});

const VEHICLES = [
  { value: "motorbike", label: "Motorbike" },
  { value: "scooter", label: "Scooter" },
  { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car" },
  { value: "on_foot", label: "On foot" },
] as const;

function RiderProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["rider", "me"], queryFn: () => getMyRiderProfile() });

  const [form, setForm] = useState({
    full_name: "",
    phone_e164: "",
    vehicle_type: "motorbike" as (typeof VEHICLES)[number]["value"],
    vehicle_registration: "",
    id_number: "",
    service_city: "",
    service_area: "",
    bio: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      full_name: p.full_name ?? "",
      phone_e164: p.phone_e164 ?? "",
      vehicle_type: (p.vehicle_type as typeof form.vehicle_type) ?? "motorbike",
      vehicle_registration: p.vehicle_registration ?? "",
      id_number: p.id_number ?? "",
      service_city: p.service_city ?? "",
      service_area: p.service_area ?? "",
      bio: p.bio ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => upsertMyRiderProfile({ data: form }),
    onSuccess: () => {
      setOk("Profile saved.");
      qc.invalidateQueries({ queryKey: ["rider"] });
      if (!profile.data) setTimeout(() => navigate({ to: "/rider" }), 600);
    },
    onError: (e: Error) => setErr(e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    save.mutate();
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10 md:px-8">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Rider</p>
      <h1 className="mb-2 text-4xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Your rider profile
      </h1>
      <p className="mb-8 max-w-lg text-sm text-muted">
        Tell us how you deliver and where you operate. A Taylor admin will verify your ID and vehicle
        before you can accept paid orders.
      </p>

      <form onSubmit={submit} className="max-w-xl space-y-4">
        <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
        <Field label="Mobile number" value={form.phone_e164} onChange={(v) => setForm({ ...form, phone_e164: v })} placeholder="+27 82 000 0000" />

        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
            Vehicle
          </span>
          <select
            value={form.vehicle_type}
            onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as typeof form.vehicle_type })}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none"
          >
            {VEHICLES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>

        <Field label="Vehicle registration (optional)" value={form.vehicle_registration} onChange={(v) => setForm({ ...form, vehicle_registration: v })} />
        <Field label="SA ID number (optional)" value={form.id_number} onChange={(v) => setForm({ ...form, id_number: v })} />
        <Field label="Service city" value={form.service_city} onChange={(v) => setForm({ ...form, service_city: v })} placeholder="Johannesburg" />
        <Field label="Service area / suburbs" value={form.service_area} onChange={(v) => setForm({ ...form, service_area: v })} placeholder="Sandton, Randburg, Rosebank" />

        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
            About you (optional)
          </span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none"
          />
        </label>

        {err && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{err}</p>
        )}
        {ok && (
          <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">{ok}</p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60 sm:w-auto"
        >
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
