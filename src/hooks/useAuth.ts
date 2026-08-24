import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reactive Supabase auth state. Safe to call from any client component.
 * SSR renders `{ user: null, loading: true }`, then hydrates.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase re-emits auth events on token refresh and window focus. Only
    // swap state when the identity actually changed, otherwise every screen
    // re-runs its effects (which used to reset a live Taylor conversation).
    const apply = (s: Session | null) => {
      setSession((prev) => {
        if (prev?.user.id === s?.user.id && prev?.access_token === s?.access_token) {
          return prev;
        }
        return s;
      });
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => apply(s));
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: (session?.user ?? null) as User | null, loading };
}
