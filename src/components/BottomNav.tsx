import { Link, useLocation } from "@tanstack/react-router";
import { Sparkles, Store, ListChecks, User, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { countMyInboxUnread } from "@/lib/store-messages.functions";
import { useAuth } from "@/hooks/useAuth";

// Taylor is the centre "hero" action; other tabs flank it two-per-side.
const leftTabs = [
  { label: "Stores", icon: Store, target: "/stores" as const },
  { label: "Lists", icon: ListChecks, target: "/lists" as const },
] as const;
const rightTabs = [
  { label: "Inbox", icon: Inbox, target: "/inbox" as const },
  { label: "Profile", icon: User, target: "/profile" as const },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["inbox", "unread-count"],
    queryFn: () => countMyInboxUnread(),
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const unread = data?.count ?? 0;

  const isActive = (target: string) =>
    pathname === target ||
    (target === "/stores" && pathname === "/") ||
    (target === "/chat" && pathname.startsWith("/chat")) ||
    (target === "/inbox" && pathname.startsWith("/inbox"));

  const renderTab = (
    { target, label, icon: Icon }: { target: string; label: string; icon: typeof Store },
  ) => {
    const active = isActive(target);
    const showBadge = target === "/inbox" && unread > 0;
    return (
      <Link
        key={target}
        to={target}
        className={
          "flex flex-1 flex-col items-center gap-1 py-1 transition-colors " +
          (active ? "text-primary" : "text-muted hover:text-foreground")
        }
      >
        <span className="relative">
          <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
          {showBadge && (
            <span
              aria-label={`${unread} unread`}
              className="absolute -right-2 -top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
        <span className="text-[10px] font-medium tracking-tight">{label}</span>
      </Link>
    );
  };

  const taylorActive = isActive("/chat");

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 border-t border-border bg-card pb-8 pt-2"
    >
      <div className="relative flex items-end justify-between px-4">
        <div className="flex flex-1 items-end justify-around">
          {leftTabs.map(renderTab)}
        </div>

        {/* Centre notch + floating Taylor button */}
        <div className="relative flex w-20 shrink-0 justify-center">
          {/* Cut-out arc that dips into the nav */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-16 w-20 rounded-b-[999px] bg-background"
          />
          <Link
            to="/chat"
            aria-label="Chat with Taylor"
            className={
              "relative -mt-8 flex size-16 items-center justify-center rounded-full border-4 border-background shadow-lg transition-transform active:scale-95 " +
              (taylorActive
                ? "bg-primary text-primary-foreground"
                : "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground")
            }
          >
            <Sparkles className="size-6" strokeWidth={2.25} />
          </Link>
          <span className="absolute -bottom-0.5 text-[10px] font-medium tracking-tight text-muted">
            Taylor
          </span>
        </div>

        <div className="flex flex-1 items-end justify-around">
          {rightTabs.map(renderTab)}
        </div>
      </div>
    </nav>
  );
}
