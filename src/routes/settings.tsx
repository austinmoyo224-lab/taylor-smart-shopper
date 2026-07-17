import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Language, currency, notification preferences and account controls.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Setup"
      title="Settings"
      description="Language, currency, notification preferences and account controls. Taylor supports multiple countries and languages from day one."
    />
  ),
});