import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/stores")({
  head: () => ({
    meta: [
      { title: "Stores - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Follow supermarkets, brands and departments. Taylor personalises everything you receive.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Follow"
      title="Stores"
      description="This is where you'll browse and follow supermarkets, brands, categories and campaigns. Coming next: subscription flow via QR and invitation links."
    />
  ),
});