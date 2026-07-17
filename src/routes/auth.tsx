import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in - Taylor Intelligence" },
      {
        name: "description",
        content:
          "Sign in to Taylor Intelligence with email, mobile or Google.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Welcome"
      title="Sign in"
      description="Email, mobile and Google sign-in arrive in the next milestone. Anonymous chat with Taylor is available now."
    />
  ),
});