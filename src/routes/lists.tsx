import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/lists")({
  head: () => ({
    meta: [
      { title: "Shopping lists - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Personal and AI-generated shopping lists with estimated basket value and expected savings.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Plan"
      title="Shopping lists"
      description="Personal and AI-built lists. Taylor estimates your basket value and highlights how much you would save by shopping the current specials."
    />
  ),
});