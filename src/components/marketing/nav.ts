import {
  MessageCircle,
  Camera,
  ListChecks,
  ChefHat,
  Tag,
  MapPinned,
  ShoppingBag,
  Store,
  Bike,
} from "lucide-react";

export type NavLink = {
  label: string;
  to: string;
  desc: string;
  icon: typeof MessageCircle;
};

export const productLinks: NavLink[] = [
  {
    label: "Taylor Chat",
    to: "/features/chat",
    desc: "A companion that remembers your household",
    icon: MessageCircle,
  },
  {
    label: "Taylor Vision",
    to: "/features/vision",
    desc: "Scan your pantry and fridge in multiple photos",
    icon: Camera,
  },
  {
    label: "Smart lists & prices",
    to: "/features/lists",
    desc: "Build lists and compare real SA prices",
    icon: ListChecks,
  },
  {
    label: "Recipes",
    to: "/features/recipes",
    desc: "Cook it, picture it, shop it, share it",
    icon: ChefHat,
  },
  {
    label: "Deals, coupons & loyalty",
    to: "/features/deals",
    desc: "Specials from the stores you follow",
    icon: Tag,
  },
  {
    label: "Eating out & road trips",
    to: "/features/travel",
    desc: "Restaurants, ratings, weather and timing",
    icon: MapPinned,
  },
];

export const solutionLinks: NavLink[] = [
  {
    label: "For shoppers",
    to: "/for-shoppers",
    desc: "Free forever, built for South African homes",
    icon: ShoppingBag,
  },
  {
    label: "For stores",
    to: "/for-stores",
    desc: "A retail operating system for your store",
    icon: Store,
  },
  {
    label: "For delivery riders",
    to: "/for-riders",
    desc: "Get verified and deliver paid store orders",
    icon: Bike,
  },
];

export const flatLinks = [
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
];