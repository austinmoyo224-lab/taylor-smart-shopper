import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/fire-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { advanceReminder } = await import("@/lib/reminders.server");
        const { sendPushToUser } = await import("@/lib/push.server");

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("taylor_reminders")
          .select("id, user_id, title, body, timezone, recurrence, byday, hour, minute, next_fire_at")
          .eq("is_active", true)
          .lte("next_fire_at", nowIso)
          .limit(200);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!due || due.length === 0) {
          return new Response(JSON.stringify({ ok: true, fired: 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        let fired = 0;
        for (const r of due) {
          try {
            await supabaseAdmin.from("notifications").insert({
              user_id: r.user_id,
              category: "reminder",
              channel: "in_app",
              status: "delivered",
              title: `⏰ ${r.title}`,
              body: r.body ?? "Taylor reminder",
              delivered_at: new Date().toISOString(),
              payload: { reminder_id: r.id },
            });
            try {
              await sendPushToUser(r.user_id, {
                title: `⏰ ${r.title}`,
                body: r.body ?? "Taylor reminder",
                url: "/notifications",
                tag: `reminder-${r.id}`,
                data: { reminder_id: r.id },
              });
            } catch (e) {
              console.error("[fire-reminders] push failed", e);
            }

            const nextAt = advanceReminder({
              recurrence: r.recurrence,
              timezone: r.timezone,
              hour: r.hour,
              minute: r.minute,
              byday: r.byday,
              next_fire_at: r.next_fire_at,
            });
            if (nextAt) {
              await supabaseAdmin
                .from("taylor_reminders")
                .update({
                  last_fired_at: new Date().toISOString(),
                  next_fire_at: nextAt.toISOString(),
                })
                .eq("id", r.id);
            } else {
              await supabaseAdmin
                .from("taylor_reminders")
                .update({
                  last_fired_at: new Date().toISOString(),
                  is_active: false,
                })
                .eq("id", r.id);
            }
            fired++;
          } catch (e) {
            console.error("[fire-reminders] error on", r.id, e);
          }
        }

        return new Response(JSON.stringify({ ok: true, fired }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});