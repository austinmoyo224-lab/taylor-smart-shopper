import { Link, useLocation } from "@tanstack/react-router";
import { MessageCircle, Store, UtensilsCrossed, ListChecks, User } from "lucide-react";

const tabs = [
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/stores", label: "Stores", icon: Store },
  { to: "/lists", label: "Lists", icon: ListChecks },
  { to: "/recipes", label: "Recipes", icon: UtensilsCrossed },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 flex items-center justify-between border-t border-border bg-card px-6 pb-8 pt-2"
    >
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || (to === "/chat" && pathname === "/");
        return (
          <Link
            key={to}
            to={to}
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