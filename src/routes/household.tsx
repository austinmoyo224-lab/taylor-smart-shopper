import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptHouseholdInvite,
  createHousehold,
  createHouseholdInvite,
  getHousehold,
  leaveHousehold,
  listMyHouseholds,
  removeHouseholdMember,
  sharePantryWithHousehold,
} from "@/lib/households.functions";
import { Copy, Home, LogOut, Plus, UserMinus, Users } from "lucide-react";
import { Paginator, usePaged } from "@/components/Paginator";

export const Route = createFileRoute("/household")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Household - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Share lists and pantry with the people you live with. Everyone contributes, Taylor keeps it in sync.",
      },
    ],
  }),
  component: HouseholdScreen,
});

function HouseholdScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const households = useQuery({
    queryKey: ["households", "mine"],
    queryFn: () => listMyHouseholds(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!activeId && households.data && households.data.length > 0) {
      setActiveId(households.data[0].id);
    }
  }, [households.data, activeId]);

  const detail = useQuery({
    queryKey: ["household", activeId],
    queryFn: () => getHousehold({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const create = useMutation({
    mutationFn: () => createHousehold({ data: { name: name.trim() } }),
    onSuccess: (res) => {
      setName("");
      setActiveId(res.id);
      void qc.invalidateQueries({ queryKey: ["households", "mine"] });
    },
  });

  const accept = useMutation({
    mutationFn: () => acceptHouseholdInvite({ data: { code: inviteCode.trim() } }),
    onSuccess: (res) => {
      setInviteCode("");
      setActiveId(res.householdId);
      void qc.invalidateQueries({ queryKey: ["households", "mine"] });
    },
  });

  const invite = useMutation({
    mutationFn: () => createHouseholdInvite({ data: { householdId: activeId! } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household", activeId] }),
  });

  const leave = useMutation({
    mutationFn: () => leaveHousehold({ data: { householdId: activeId! } }),
    onSuccess: () => {
      setActiveId(null);
      void qc.invalidateQueries({ queryKey: ["households", "mine"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: (uid: string) =>
      removeHouseholdMember({ data: { householdId: activeId!, userId: uid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household", activeId] }),
  });

  const sharePantry = useMutation({
    mutationFn: (hid: string | null) => sharePantryWithHousehold({ data: { householdId: hid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pantry", "mine"] }),
  });

  const empty = !households.isLoading && (households.data?.length ?? 0) === 0;

  const membersPager = usePaged(detail.data?.members ?? undefined);
  const invitesPager = usePaged(detail.data?.invites ?? undefined);

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Together</p>
        <h1
          className="text-3xl italic tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Household
        </h1>
        <p className="mt-1 text-xs text-muted">
          Share your shopping lists and pantry with the people you live with.
        </p>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {empty && (
          <>
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Home className="size-4 text-primary" />
                <h2 className="text-sm font-medium">Start a household</h2>
              </div>
              <p className="text-xs text-muted">
                Give it a name like "The Nkosi kitchen" or "Flat 12B".
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Household name"
                className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm"
              />
              <button
                onClick={() => create.mutate()}
                disabled={!name.trim() || create.isPending}
                className="flex w-full items-center justify-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                <Plus className="size-4" /> Create
              </button>
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-card/40 p-4">
              <h2 className="text-sm font-medium">Have an invite code?</h2>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CDEF"
                className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm tracking-widest"
              />
              <button
                onClick={() => accept.mutate()}
                disabled={!inviteCode.trim() || accept.isPending}
                className="w-full rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Join household
              </button>
              {accept.error && (
                <p className="text-[11px] text-destructive">{(accept.error as Error).message}</p>
              )}
            </section>
          </>
        )}

        {!empty && households.data && households.data.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {households.data.map((h) => (
              <button
                key={h.id}
                onClick={() => setActiveId(h.id)}
                className={
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs " +
                  (activeId === h.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted")
                }
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        {detail.data && (
          <>
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {detail.data.isOwner ? "You own this" : "You're a member"}
                  </p>
                  <h2
                    className="mt-1 text-xl italic"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {detail.data.household.name}
                  </h2>
                </div>
                <Users className="size-4 text-muted" />
              </div>

              <ul className="space-y-2">
                {membersPager.paged.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <div>
                      <p>{m.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted">{m.role}</p>
                    </div>
                    {detail.data!.isOwner && m.user_id !== user?.id && (
                      <button
                        onClick={() => removeMember.mutate(m.user_id)}
                        className="text-muted hover:text-destructive"
                        aria-label="Remove member"
                      >
                        <UserMinus className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <Paginator
                page={membersPager.page}
                pageCount={membersPager.pageCount}
                total={membersPager.total}
                start={membersPager.start}
                end={membersPager.end}
                onPageChange={membersPager.setPage}
              />
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium">Invite someone</h3>
              <p className="text-xs text-muted">
                Share a code — it works for 14 days, single use.
              </p>
              <button
                onClick={() => invite.mutate()}
                disabled={invite.isPending}
                className="flex w-full items-center justify-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                <Plus className="size-4" /> Create invite code
              </button>
              {detail.data.invites.length > 0 && (
                <>
                <ul className="space-y-2">
                  {invitesPager.paged.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-mono tracking-widest">{i.code}</p>
                        <p className="text-[10px] text-muted">
                          Expires {new Date(i.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(i.code)}
                        className="text-muted hover:text-foreground"
                        aria-label="Copy code"
                      >
                        <Copy className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Paginator
                  page={invitesPager.page}
                  pageCount={invitesPager.pageCount}
                  total={invitesPager.total}
                  start={invitesPager.start}
                  end={invitesPager.end}
                  onPageChange={invitesPager.setPage}
                />
                </>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-card/40 p-4">
              <h3 className="text-sm font-medium">Shared kitchen</h3>
              <p className="text-xs text-muted">
                Move all of your pantry items into this household so everyone sees the same
                fridge.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => sharePantry.mutate(detail.data!.household.id)}
                  className="flex-1 rounded-full bg-primary px-3 py-2 text-xs text-primary-foreground"
                >
                  Share my pantry
                </button>
                <button
                  onClick={() => sharePantry.mutate(null)}
                  className="flex-1 rounded-full border border-border px-3 py-2 text-xs"
                >
                  Make private
                </button>
              </div>
            </section>

            <button
              onClick={() => leave.mutate()}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-xs text-muted hover:text-destructive"
            >
              <LogOut className="size-3.5" />
              {detail.data.isOwner ? "Leave (as owner)" : "Leave household"}
            </button>

            <section className="space-y-3 rounded-2xl border border-dashed border-border p-4">
              <h3 className="text-sm font-medium">Add another household</h3>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm tracking-widest"
              />
              <button
                onClick={() => accept.mutate()}
                disabled={!inviteCode.trim() || accept.isPending}
                className="w-full rounded-full border border-border px-4 py-2 text-xs disabled:opacity-50"
              >
                Join with code
              </button>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}