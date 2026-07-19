import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAiUsageSummary, getAiUsageTopUsers } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/ai-usage")({
  head: () => ({ meta: [{ title: "AI usage — Taylor Intelligence" }] }),
  component: AiUsagePage,
});

function AiUsagePage() {
  const [days, setDays] = useState(14);
  const summary = useQuery({
    queryKey: ["admin", "ai-usage", "summary", days],
    queryFn: () => getAiUsageSummary({ data: { days } }),
  });
  const top = useQuery({
    queryKey: ["admin", "ai-usage", "top", days],
    queryFn: () => getAiUsageTopUsers({ data: { days } }),
  });

  const s = summary.data;
  const maxDaily = Math.max(
    1,
    ...(s?.daily ?? []).map((d) => d.chat + d.stt + d.tts + d.vision),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Admin</p>
          <h1
            className="text-3xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AI usage & credits
          </h1>
          <p className="mt-1 text-sm text-muted">
            Estimated Lovable AI Gateway spend across chat, STT, TTS and vision.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm"
        >
          {[7, 14, 30, 60, 90].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total credits" value={fmt(s?.totalCredits ?? 0, 2)} />
        <Kpi label="AI calls" value={fmt(s?.totalCalls ?? 0)} />
        <Kpi label="Unique users" value={fmt(s?.uniqueUsers ?? 0)} />
        <Kpi
          label="Avg / day"
          value={fmt((s?.totalCredits ?? 0) / Math.max(1, days), 2)}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">By operation</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {(["chat", "stt", "tts", "vision"] as const).map((op) => {
            const row = s?.byOperation.find((b) => b.operation === op);
            return (
              <div key={op} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted">{opLabel(op)}</p>
                <p className="mt-2 text-2xl font-medium">{fmt(row?.credits ?? 0, 2)}</p>
                <p className="mt-1 text-xs text-muted">{fmt(row?.count ?? 0)} calls</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Credits per day</h2>
        <div className="rounded-2xl border border-border bg-card p-4">
          {s?.daily?.length ? (
            <div className="flex h-56 items-end gap-1">
              {s.daily.map((d) => {
                const total = d.chat + d.stt + d.tts + d.vision;
                const h = (v: number) => (total ? (v / maxDaily) * 100 : 0);
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 flex-col-reverse overflow-hidden rounded-md bg-muted/20">
                      <span style={{ height: `${h(d.chat)}%` }} className="w-full bg-primary" title={`chat ${d.chat.toFixed(2)}`} />
                      <span style={{ height: `${h(d.stt)}%` }} className="w-full bg-blue-500" title={`stt ${d.stt.toFixed(2)}`} />
                      <span style={{ height: `${h(d.tts)}%` }} className="w-full bg-purple-500" title={`tts ${d.tts.toFixed(2)}`} />
                      <span style={{ height: `${h(d.vision)}%` }} className="w-full bg-amber-500" title={`vision ${d.vision.toFixed(2)}`} />
                    </div>
                    <span className="text-[9px] text-muted">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No usage recorded yet.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted">
            <Legend color="bg-primary" label="Chat" />
            <Legend color="bg-blue-500" label="STT" />
            <Legend color="bg-purple-500" label="TTS" />
            <Legend color="bg-amber-500" label="Vision" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Top users</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/10 text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Calls</th>
                <th className="px-4 py-3">Chat</th>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">TTS</th>
                <th className="px-4 py-3">Vision</th>
                <th className="px-4 py-3 text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {(top.data ?? []).map((u) => (
                <tr key={u.userId} className="border-t border-border">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.calls}</td>
                  <td className="px-4 py-3">{u.chat.toFixed(2)}</td>
                  <td className="px-4 py-3">{u.stt.toFixed(2)}</td>
                  <td className="px-4 py-3">{u.tts.toFixed(2)}</td>
                  <td className="px-4 py-3">{u.vision.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium">{u.credits.toFixed(2)}</td>
                </tr>
              ))}
              {top.data && top.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-muted">
                    No per-user usage yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium">{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function opLabel(op: string) {
  return op === "stt" ? "STT" : op === "tts" ? "TTS" : op.charAt(0).toUpperCase() + op.slice(1);
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}