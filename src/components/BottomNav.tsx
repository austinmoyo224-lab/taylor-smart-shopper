import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, Store, ListChecks, User, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { countMyInboxUnread } from "@/lib/store-messages.functions";
import { useAuth } from "@/hooks/useAuth";

// Stores is the landing tab and sits in the centre of the bottom nav.
const tabs = [
  { to: "/chat", label: "Taylor", icon: MessageCircle, target: "/chat" as const },
  { to: "/lists", label: "Lists", icon: ListChecks, target: "/lists" as const },
  { to: "/stores", label: "Stores", icon: Store, target: "/stores" as const },
  { to: "/inbox", label: "Inbox", icon: Inbox, target: "/inbox" as const },
  { to: "/profile", label: "Profile", icon: User, target: "/profile" as const },
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
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 flex items-center justify-between border-t border-border bg-card px-6 pb-8 pt-2"
    >
      {tabs.map(({ target, label, icon: Icon }) => {
        const active =
          pathname === target ||
          (target === "/stores" && pathname === "/") ||
          (target === "/chat" && pathname.startsWith("/chat")) ||
          (target === "/inbox" && pathname.startsWith("/inbox"));
        const showBadge = target === "/inbox" && unread > 0;
        return (
          <Link
            key={target}
            to={target}
            className={
              "flex flex-col items-center gap-1 transition-colors " +
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
      })}
    </nav>
  );
}
