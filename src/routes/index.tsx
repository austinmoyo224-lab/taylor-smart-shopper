import { createFileRoute, redirect } from "@tanstack/react-router";

// Chat is Taylor's default landing screen. See plan Milestone 1.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});
