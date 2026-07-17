import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Your preferences, favourite stores and the memories Taylor uses to personalise your experience.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="You"
      title="Profile"
      description="Your preferences, favourite stores, dietary needs and the memories Taylor uses to personalise your experience. All opt-in, all under your control."
    />
  ),
});