import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Stores is the landing screen: followed stores + rotating ads.
    throw redirect({ to: "/stores" });
  },
});
