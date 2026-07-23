import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Trash2, Power } from "lucide-react";
import {
  getTaylorSettings,
  updateTaylorSettings,
  listTaylorTraining,
  createTaylorTraining,
  toggleTaylorTraining,
  deleteTaylorTraining,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/taylor")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Train Taylor — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminTaylorPage,
});

type Settings = {
  display_name: string;
  tagline: string;
  avatar_url: string;
  voice: string;
  personality_traits: string;
  system_prompt_addon: string;
  temperature: number;
  is_active: boolean;
};

const DEFAULTS: Settings = {
  display_name: "Taylor",
  tagline: "Your shopping companion",
  avatar_url: "",
  voice: "shimmer",
  personality_traits: "",
  system_prompt_addon: "",
  temperature: 0.7,
  is_active: true,
};

function AdminTaylorPage() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["admin", "taylor", "settings"],
    queryFn: () => getTaylorSettings(),
  });
  const trainingQ = useQuery({
    queryKey: ["admin", "taylor", "training"],
    queryFn: () => listTaylorTraining(),
  });

  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = settingsQ.data;
    if (!s) return;
    setForm({
      display_name: s.display_name ?? "Taylor",
      tagline: s.tagline ?? "",
      avatar_url: s.avatar_url ?? "",
      voice: s.voice ?? "shimmer",
      personality_traits: s.personality_traits ?? "",
      system_prompt_addon: s.system_prompt_addon ?? "",
      temperature: Number(s.temperature ?? 0.7),
      is_active: s.is_active ?? true,
    });
  }, [settingsQ.data]);

  const saveMut = useMutation({
    mutationFn: (data: Settings) => updateTaylorSettings({ data }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["admin", "taylor", "settings"] });
    },
  });

  const [tPrompt, setTPrompt] = useState("");
  const [tResp, setTResp] = useState("");
  const [tCat, setTCat] = useState("");
  const addTraining = useMutation({
    mutationFn: (d: { prompt: string; ideal_response: string; category?: string }) =>
      createTaylorTraining({ data: d }),
    onSuccess: () => {
      setTPrompt("");
      setTResp("");
      setTCat("");
      qc.invalidateQueries({ queryKey: ["admin", "taylor", "training"] });
    },
  });
  const toggleTraining = useMutation({
    mutationFn: (d: { id: string; is_active: boolean }) => toggleTaylorTraining({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "taylor", "training"] }),
  });
  const removeTraining = useMutation({
    mutationFn: (id: string) => deleteTaylorTraining({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "taylor", "training"] }),
  });

  function onSaveSettings(e: FormEvent) {
    e.preventDefault();
    saveMut.mutate(form);
  }
  function onAddTraining(e: FormEvent) {
    e.preventDefault();
    if (!tPrompt.trim() || !tResp.trim()) return;
    addTraining.mutate({
      prompt: tPrompt.trim(),
      ideal_response: tResp.trim(),
      category: tCat.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Admin</p>
      <h1 className="text-3xl italic tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Train Taylor
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Shape Taylor's identity, tone, and knowledge. Changes apply immediately to every subscriber
        chat.
      </p>

      {/* Profile */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="size-16 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-lg font-bold text-primary">
                T
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Taylor's profile</h2>
            <p className="text-xs text-muted">How she introduces herself to subscribers</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest " +
                (form.is_active
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive")
              }
            >
              <Power className="size-3" /> {form.is_active ? "Live" : "Paused"}
            </span>
          </div>
        </div>

        <form onSubmit={onSaveSettings} className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="input"
              required
            />
          </Field>
          <Field label="Tagline">
            <input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Avatar image URL" hint="Paste a public image URL for Taylor's face">
            <input
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://…"
              className="input"
            />
          </Field>
          <Field label="Voice" hint="TTS voice (e.g. shimmer, alloy, nova, sage)">
            <input
              value={form.voice}
              onChange={(e) => setForm({ ...form, voice: e.target.value })}
              className="input"
            />
          </Field>
          <Field label={`Creativity (${form.temperature.toFixed(2)})`} className="sm:col-span-2">
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label="Personality traits" className="sm:col-span-2">
            <textarea
              rows={2}
              value={form.personality_traits}
              onChange={(e) => setForm({ ...form, personality_traits: e.target.value })}
              placeholder="Warm, chatty South African woman. Patient, curious, never salesy."
              className="input"
            />
          </Field>
          <Field
            label="Extra instructions (system prompt add-on)"
            hint="Rules Taylor must obey on top of her core prompt"
            className="sm:col-span-2"
          >
            <textarea
              rows={6}
              value={form.system_prompt_addon}
              onChange={(e) => setForm({ ...form, system_prompt_addon: e.target.value })}
              placeholder="e.g. Always suggest a recipe pairing when quoting a fresh-produce deal."
              className="input font-mono text-xs"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Taylor is live for subscribers
          </label>

          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saveMut.isPending ? "Saving…" : "Save profile"}
            </button>
            {saved && <span className="text-xs text-primary">Saved ✓</span>}
            {saveMut.error && (
              <span className="text-xs text-destructive">
                {(saveMut.error as Error).message}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Training */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Training examples</h2>
        <p className="mt-1 text-xs text-muted">
          Give Taylor sample Q&amp;A pairs. She'll mirror this tone and structure. Toggle off to
          keep an example without using it.
        </p>

        <form onSubmit={onAddTraining} className="mt-4 grid gap-3">
          <input
            value={tCat}
            onChange={(e) => setTCat(e.target.value)}
            placeholder="Category (optional) — e.g. Greetings, Deals, Recipes"
            className="input"
          />
          <textarea
            rows={2}
            value={tPrompt}
            onChange={(e) => setTPrompt(e.target.value)}
            placeholder="Subscriber question — e.g. What's on special at Checkers this week?"
            className="input"
            required
          />
          <textarea
            rows={4}
            value={tResp}
            onChange={(e) => setTResp(e.target.value)}
            placeholder="Taylor's ideal response…"
            className="input"
            required
          />
          <div>
            <button
              type="submit"
              disabled={addTraining.isPending}
              className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
            >
              {addTraining.isPending ? "Adding…" : "Add example"}
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-2">
          {trainingQ.data?.length === 0 && (
            <p className="text-xs text-muted">No training examples yet.</p>
          )}
          {trainingQ.data?.map((row) => (
            <div
              key={row.id}
              className={
                "rounded-2xl border p-4 " +
                (row.is_active ? "border-border bg-background" : "border-dashed border-border bg-surface opacity-60")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {row.category && (
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                      {row.category}
                    </p>
                  )}
                  <p className="text-sm font-medium">{row.prompt}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted">
                    {row.ideal_response}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() =>
                      toggleTraining.mutate({ id: row.id, is_active: !row.is_active })
                    }
                    className="rounded-full border border-border px-2 py-1 text-[10px]"
                  >
                    {row.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => removeTraining.mutate(row.id)}
                    aria-label="Delete"
                    className="rounded-full border border-border p-1.5 text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border, hsl(0 0% 90%));
          background: var(--background, #fff);
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
        }
        .input:focus { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"flex flex-col gap-1.5 " + className}>
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-muted">{hint}</span>}
    </label>
  );
}