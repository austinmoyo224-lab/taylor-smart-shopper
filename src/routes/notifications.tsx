import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { CheckCheck, Bell, Inbox } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications - Taylor Intelligence" },
      {
        name: "description",
        content: "Updates Taylor has surfaced for you from the stores you follow.",
      },
    ],
  }),
  component: NotificationsScreen,
});

function NotificationsScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "mine"],
    queryFn: () => listMyNotifications(),
    enabled: !!user,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <AppShell>
      <header className="border-b border-border bg-background px-6 pb-4 pt-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              Updates
            </p>
            <h1
              className="text-3xl italic tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Notifications
            </h1>
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted hover:text-foreground"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          )}
        </div>
        <Link
          to="/inbox"
          className="mt-3 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 hover:border-primary"
        >
          <span className="flex items-center gap-2">
            <Inbox className="size-4 text-primary" />
            <span className="text-sm font-medium">Store inbox</span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-primary">Open</span>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading && <p className="px-2 py-6 text-sm text-muted">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
            <Bell className="mx-auto mb-3 size-5 text-muted" />
            You're all caught up. Taylor will let you know when stores you follow have something
            worth your time.
          </div>
        )}
        <ul className="space-y-2">
          {(data ?? []).map((n) => {
            const unread = !n.read_at;
            return (
              <li
                key={n.id}
                onClick={() => unread && markOne.mutate(n.id)}
                className={
                  "cursor-pointer rounded-2xl border px-4 py-3 transition " +
                  (unread ? "border-primary/30 bg-primary/5" : "border-border bg-card")
                }
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary">
                    {n.category.replace("_", " ")}
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    {new Date(n.created_at).toLocaleString("en-ZA", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug">{n.title}</p>
                {n.body && <p className="mt-1 text-xs leading-relaxed text-muted">{n.body}</p>}
              </li>
            );
          })}
        </ul>
      </main>
    </AppShell>
  );
}
