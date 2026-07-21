import { sendLovableEmail } from "@lovable.dev/email-js";

// In-memory cooldown so we don't flood the owner while the cap is hit.
// Serverless workers may reset this between cold starts — that's fine;
// worst case the owner gets one extra email per instance.
const COOLDOWN_MS = 30 * 60 * 1000;
let lastSentAt = 0;
let inFlight: Promise<void> | null = null;

const SITE_NAME = "Taylor Intelligence";
const FROM_DOMAIN = "heytaylor.co.za";
const SENDER_DOMAIN = "notify.heytaylor.co.za";

export type CreditAlertContext = {
  route: string;
  operation: "chat" | "tts" | "stt" | "vision" | string;
  status?: number;
  providerMessage?: string;
  userId?: string | null;
};

async function resolveOwnerEmails(): Promise<string[]> {
  // Explicit override wins.
  const override = process.env.CREDIT_ALERT_EMAIL;
  if (override) {
    return override
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    if (error || !roles?.length) return [];
    const emails: string[] = [];
    for (const r of roles) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      const email = data?.user?.email;
      if (email) emails.push(email);
    }
    return Array.from(new Set(emails));
  } catch (e) {
    console.error("[credit-alert] failed resolving owner emails", e);
    return [];
  }
}

function renderBody(ctx: CreditAlertContext) {
  const when = new Date().toISOString();
  const lines = [
    `Taylor AI Gateway returned credit_limit_reached.`,
    ``,
    `Route:      ${ctx.route}`,
    `Operation:  ${ctx.operation}`,
    ctx.status ? `HTTP:       ${ctx.status}` : "",
    ctx.userId ? `Affected user: ${ctx.userId}` : `Affected user: anonymous`,
    ctx.providerMessage ? `Provider:   ${ctx.providerMessage}` : "",
    ``,
    `Detected at ${when}. Subscribers are currently seeing "Taylor's AI credits have run out."`,
    ``,
    `Action: top up credits or raise the workspace AI Gateway limit to restore replies immediately.`,
  ].filter(Boolean);
  const text = lines.join("\n");
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55;color:#0b1220">
    <h2 style="margin:0 0 12px;color:#c1121f">⚠️ Taylor AI credits exhausted</h2>
    <p>${text.split("\n").join("<br/>")}</p>
  </div>`;
  return { text, html };
}

/**
 * Fire a credit-exhaustion alert to the workspace owner(s).
 * Non-blocking, dedup'd by an in-memory cooldown. Safe to call from any request path.
 */
export function notifyCreditsExhausted(ctx: CreditAlertContext): void {
  const now = Date.now();
  if (inFlight) return;
  if (now - lastSentAt < COOLDOWN_MS) return;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    console.warn("[credit-alert] LOVABLE_API_KEY missing, cannot email owner");
    return;
  }

  lastSentAt = now; // reserve the cooldown window immediately
  inFlight = (async () => {
    try {
      const recipients = await resolveOwnerEmails();
      if (!recipients.length) {
        console.error(
          "[credit-alert] credit_limit_reached but no super_admin email found",
          ctx,
        );
        return;
      }
      const { text, html } = renderBody(ctx);
      const subject = `[${SITE_NAME}] AI credits exhausted — action required`;
      for (const to of recipients) {
        try {
          await sendLovableEmail(
            {
              to,
              from: `${SITE_NAME} <alerts@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject,
              html,
              text,
              purpose: "credit_limit_alert",
              label: "credit_limit_reached",
              idempotency_key: `credit-limit-${Math.floor(now / COOLDOWN_MS)}-${to}`,
            },
            { apiKey, sendUrl: process.env.LOVABLE_SEND_URL },
          );
          console.log(`[credit-alert] notified ${to}`);
        } catch (e) {
          console.error(`[credit-alert] failed sending to ${to}`, e);
        }
      }
    } finally {
      inFlight = null;
    }
  })();
}

/** Detect the gateway's credit-exhausted response from a status + body/text. */
export function isCreditLimitError(status: number | undefined, message: string | undefined) {
  const msg = (message ?? "").toLowerCase();
  if (status === 402) return true;
  if (status === 403 && (msg.includes("credit") || msg.includes("forbidden"))) return true;
  return msg.includes("credit_limit_reached") || msg.includes("credits have run out");
}