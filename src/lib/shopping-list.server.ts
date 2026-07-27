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

const RECIPE_MEASUREMENT_UNITS = [
  ...COOKING_UNITS,
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "ml",
  "l",
  "litre",
  "litres",
  "liter",
  "liters",
  "can",
  "cans",
  "tin",
  "tins",
  "pack",
  "packs",
  "piece",
  "pieces",
];

const RETAIL_SIZE_UNITS = new Set([
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "ml",
  "l",
  "litre",
  "litres",
  "liter",
  "liters",
  "pack",
  "packs",
  "can",
  "cans",
  "tin",
  "tins",
  "bag",
  "bags",
  "box",
  "boxes",
  "bottle",
  "bottles",
  "roll",
  "rolls",
]);

const COOKING_UNIT_PATTERN = COOKING_UNITS.join("|");
const RECIPE_MEASUREMENT_PATTERN = RECIPE_MEASUREMENT_UNITS.join("|");

export function cleanShoppingSearchName(value: string) {
  return value
    .replace(new RegExp(`^\\s*\\d+(?:[.,/]\\d+)?\\s*(?:${COOKING_UNIT_PATTERN})\\b\\s*(?:of\\s+)?`, "i"), "")
    .replace(new RegExp(`\\b\\d+(?:[.,/]\\d+)?\\s*(?:${COOKING_UNIT_PATTERN})\\b`, "gi"), "")
    .replace(/\s*[·•-]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanRecipeIngredientName(value: string) {
  return cleanShoppingSearchName(value)
    .replace(
      new RegExp(`^\\s*\\d+(?:[.,/]\\d+)?\\s*(?:${RECIPE_MEASUREMENT_PATTERN})\\b\\s*(?:of\\s+)?`, "i"),
      "",
    )
    .replace(new RegExp(`\\b\\d+(?:[.,/]\\d+)?\\s*(?:${RECIPE_MEASUREMENT_PATTERN})\\b\\s*$`, "i"), "")
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

function formatQuantity(quantity: number) {
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2)));
}

export function buildShoppingPriceInput(
  name: string,
  quantity?: number | null,
  unit?: string | null,
) {
  const cleanName = cleanShoppingSearchName(name) || name.trim();
  const qty = quantity == null ? null : Number(quantity);
  const unitText = (unit ?? "").trim();
  const unitKey = unitText.toLowerCase();
  const hasUsableQuantity = qty != null && Number.isFinite(qty) && qty > 0;
  const measurement = hasUsableQuantity
    ? `${formatQuantity(qty)}${unitText ? unitText : ""}`.trim()
    : unitText;

  if (hasUsableQuantity && unitText && RETAIL_SIZE_UNITS.has(unitKey)) {
    const compact = `${formatQuantity(qty)}${unitText}`.toLowerCase();
    const spaced = `${formatQuantity(qty)} ${unitText}`.toLowerCase();
    const lowerName = cleanName.toLowerCase();
    return {
      searchName:
        lowerName.includes(compact) || lowerName.includes(spaced)
          ? cleanName
          : `${cleanName} ${formatQuantity(qty)}${unitText}`,
      priceMultiplier: 1,
      measurement,
    };
  }

  if (hasUsableQuantity && !unitText) {
    return { searchName: cleanName, priceMultiplier: qty, measurement: `×${formatQuantity(qty)}` };
  }

  return { searchName: cleanName, priceMultiplier: 1, measurement };
}