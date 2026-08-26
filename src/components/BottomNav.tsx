import { Link, useLocation } from "@tanstack/react-router";
import { Store, ListChecks, ChefHat, Inbox, MapPinned } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { countMyInboxUnread } from "@/lib/store-messages.functions";
import { useAuth } from "@/hooks/useAuth";
import taylorCharacter from "@/assets/taylor-face.jpg.asset.json";


// Taylor is the centre "hero" action; other tabs flank it two-per-side.
const leftTabs = [
  { label: "Stores", icon: Store, target: "/stores" as const },
  { label: "Lists", icon: ListChecks, target: "/lists" as const },
] as const;
const rightTabs = [
  { label: "Inbox", icon: Inbox, target: "/inbox" as const },
  { label: "Travel", icon: MapPinned, target: "/travel" as const },
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
      className="sticky bottom-0 z-30 min-h-[84px] border-t border-border bg-card pb-5 pt-1"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="relative flex h-full min-h-[inherit] items-end justify-between px-2 sm:px-4">
        <div className="flex flex-1 items-end justify-around">
          {leftTabs.map(renderTab)}
        </div>

        {/* Centre notch + floating Taylor button */}
        <div className="relative flex w-[72px] shrink-0 justify-center sm:w-20">
          {/* Cut-out arc that dips into the nav */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-11 w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-b-[999px] bg-background ring-1 ring-border/40 sm:h-12 sm:w-20"
          />
          <Link
            to="/chat"
            aria-label="Chat with Taylor"
            className={
              "relative -mt-6 flex size-14 items-center justify-center rounded-full border-[3px] border-background bg-background p-1 shadow-xl shadow-foreground/10 transition-transform active:scale-95 dark:border-border dark:bg-card dark:shadow-primary/25 sm:-mt-7 sm:size-16 sm:border-4 sm:p-1.5 " +
              (taylorActive ? "ring-2 ring-primary/30" : "")
            }
          >
            <span className="relative flex size-full overflow-hidden rounded-full bg-primary-foreground">
              <img
                src={taylorCharacter.url}
                alt="Taylor"
                className="size-full object-cover object-top"
                draggable={false}
              />
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-end justify-around">
          {rightTabs.map(renderTab)}
        </div>
      </div>
    </nav>
  );
}
