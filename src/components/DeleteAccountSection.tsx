import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";

/**
 * In-app permanent account deletion (App Store / Play Store requirement).
 * Deletes the auth record and all personal data, signs out, then shows the
 * "Your account has been deleted" confirmation screen.
 */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount({ data: { confirm: "DELETE" } });
      await supabase.auth.signOut();
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
      window.location.replace("/account-deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-destructive">
        Danger zone
      </h2>
      <p className="mt-2 text-xs text-muted">
        Deleting your account permanently removes your login, profile, chats, lists, recipes,
        scans, pantry, uploads, follows and rewards. Records we must keep for accounting are
        anonymised so they can no longer be linked to you. This cannot be undone.
      </p>
      <button
        onClick={() => {
          setOpen(true);
          setConfirmText("");
          setError(null);
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-destructive/50 px-4 py-3 text-xs text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3.5" />
        Delete my account
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <h3 id="delete-account-title" className="text-sm font-medium">
                  Permanently delete your account?
                </h3>
                <p className="mt-1 text-xs text-muted">
                  This is permanent. Your account and all associated data will be deleted
                  immediately and cannot be recovered.
                </p>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">
                Type DELETE to confirm
              </span>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-full border border-border px-4 py-3 text-xs text-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"}
                className="flex-1 rounded-full bg-destructive px-4 py-3 text-xs text-destructive-foreground disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
