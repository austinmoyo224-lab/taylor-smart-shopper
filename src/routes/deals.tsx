import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Deals - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Weekly specials, flash sales and coupons - personalised by Taylor to what you actually buy.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Personalised"
      title="Deals"
      description="Once you follow a store, Taylor will surface only the promotions that match what you actually buy. Nothing generic, nothing spammy."
    />
  ),
});
