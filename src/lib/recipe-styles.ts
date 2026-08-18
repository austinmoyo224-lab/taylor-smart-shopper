export const RECIPE_STYLES = [
  "Surprise me",
  "Traditional South African",
  "Heritage Day braai",
  "English classic",
  "Indian / Durban curry",
  "Cape Malay",
  "Portuguese / Peri-peri",
  "Italian comfort",
  "Asian stir-fry",
  "Mexican",
  "Vegetarian",
  "Vegan",
  "Halaal-friendly",
  "Budget weeknight",
  "Healthy & light",
  "Baking & dessert",
  "Kids' favourite",
  "Slow cooker / potjie",
] as const;

export type RecipeStyle = (typeof RECIPE_STYLES)[number];
