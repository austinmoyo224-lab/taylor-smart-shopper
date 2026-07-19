import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/stores")({
  ssr: false,
  component: () => <Outlet />,
});