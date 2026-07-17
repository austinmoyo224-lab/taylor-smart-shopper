import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const Route = createFileRoute("/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons - Taylor Intelligence" },
      {
        name: "description",
        content: "Digital coupons and QR redemption from the retailers and brands you follow.",
      },
    ],
  }),
  component: () => (
    <PlaceholderScreen
      eyebrow="Save"
      title="Coupons"
      description="Redeem digital coupons by QR at the till. Taylor tracks expiry, usage limits and which of your favourite products are on offer."
    />
  ),
});
