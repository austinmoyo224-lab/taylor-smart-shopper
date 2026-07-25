import { Link, useLocation } from "@tanstack/react-router";
import { Store, ListChecks, ChefHat, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { countMyInboxUnread } from "@/lib/store-messages.functions";
import { useAuth } from "@/hooks/useAuth";

function ChatHeyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 6 h11 a3 3 0 0 1 3 3 v9 a3 3 0 0 1 -3 3 h-6 l-3 3 v-3 h-2 a3 3 0 0 1 -3 -3 v-9 a3 3 0 0 1 3 -3 z"
        className="fill-current"
      />
      <text
        x="14"
        y="16"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        fontSize="6.5"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        Hey!
      </text>
    </svg>
  );
}


// Taylor is the centre "hero" action; other tabs flank it two-per-side.
const leftTabs = [
  { label: "Stores", icon: Store, target: "/stores" as const },
  { label: "Lists", icon: ListChecks, target: "/lists" as const },
] as const;
const rightTabs = [
  { label: "Inbox", icon: Inbox, target: "/inbox" as const },
  { label: "Recipe", icon: ChefHat, target: "/recipes" as const },
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
    (target === "/inbox" && pathname.startsWith("/inbox")) ||
    (target === "/recipes" && pathname.startsWith("/recipes"));

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
            <ChatHeyIcon className="size-8" />
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
