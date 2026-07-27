const COOKING_UNITS = [
  "cup",
  "cups",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "slice",
  "slices",
  "whole",
  "large",
  "medium",
  "small",
  "clove",
  "cloves",
  "sprig",
  "sprigs",
  "pinch",
  "pinches",
  "handful",
  "handfuls",
  "dash",
  "dashes",
];

const COOKING_UNIT_PATTERN = COOKING_UNITS.join("|");

export function cleanShoppingSearchName(value: string) {
  return value
    .replace(new RegExp(`^\\s*\\d+(?:[.,/]\\d+)?\\s*(?:${COOKING_UNIT_PATTERN})\\b\\s*(?:of\\s+)?`, "i"), "")
    .replace(new RegExp(`\\b\\d+(?:[.,/]\\d+)?\\s*(?:${COOKING_UNIT_PATTERN})\\b`, "gi"), "")
    .replace(/\s*[·•-]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function buildMeasurementNote(
  quantity?: number | null,
  unit?: string | null,
  existing?: string | null,
) {
  const measurement = quantity == null ? "" : `${quantity}${unit ? unit : ""}`.trim();
  return [measurement, existing ?? ""].map((part) => part.trim()).filter(Boolean).join(" · ") || null;
}