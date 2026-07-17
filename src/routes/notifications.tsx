import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Personalised alerts for specials, coupons, expiry reminders and life moments.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Alerts"
      title="Notifications"
      description="Push and in-app alerts curated by Taylor - only the things that matter to you. You'll control every category and quiet hours."
    />
  ),
});