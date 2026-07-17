import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/recipes")({
  head: () => ({
    meta: [
      { title: "Recipes - Taylor Intelligence" },
      {
        name: "description",
        content:
          "AI-picked recipes that match your pantry, budget, weather and the specials at stores you follow.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Cook"
      title="Recipes"
      description="Recipes tuned to your pantry, budget and the weather - always paired with real specials from the stores you follow."
    />
  ),
});