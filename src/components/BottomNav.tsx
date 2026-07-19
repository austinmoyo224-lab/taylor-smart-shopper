import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, Store, ListChecks, User, Inbox } from "lucide-react";

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
        return (
          <Link
            key={target}
            to={target}
            className={
              "flex flex-col items-center gap-1 transition-colors " +
              (active ? "text-primary" : "text-muted hover:text-foreground")
            }
          >
            <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
            <span className="text-[10px] font-medium tracking-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
