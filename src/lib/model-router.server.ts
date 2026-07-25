// Dynamic model routing: cheap model for short/routine messages,
// premium for complex requests. Keeps decisions on the server.

import type { UIMessage } from "ai";

export type RoutedTier = "nano" | "mini" | "flagship";

export interface RoutedModel {
  tier: RoutedTier;
  model: string;
  reason: string;
  fast: boolean; // whether to set service_tier: "priority"
}

const NANO_MODEL = "openai/gpt-5.5"; // pinned to gpt-5.5 per user request
const MINI_MODEL = "openai/gpt-5.5";
const FLAGSHIP_MODEL = "openai/gpt-5.5";

// Signals that a message needs deeper reasoning.
const COMPLEX_KEYWORDS = [
  "plan",
  "meal plan",
  "recipe",
  "week",
  "budget",
  "compare",
  "cheapest",
  "healthiest",
  "diet",
  "allergy",
  "vegan",
  "vegetarian",
  "halal",
  "kosher",
  "diabetic",
  "why",
  "explain",
  "analyse",
  "analyze",
  "recommend",
  "shopping list",
  "grocery list",
  "step",
  "how do i",
  "help me",
];

// Very short/routine greetings and acknowledgements.
const TRIVIAL_PATTERNS: RegExp[] = [
  /^(hi|hello|hey|howzit|yo|sup|hola|molo|sawubona|dumela)\b/i,
  /^(thanks|thank you|ta|cheers|dankie|enkosi)\b/i,
  /^(ok(ay)?|cool|nice|great|lekker|👍|👌|❤️|😊)\b/i,
  /^(bye|goodbye|later|good ?night)\b/i,
  /^(yes|no|maybe|sure)\b\.?$/i,
];

function extractLatestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const parts = m.parts ?? [];
    const text = parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

function hasImageAttachment(messages: UIMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last) return false;
  return (last.parts ?? []).some((p) => {
    const t = (p as { type?: string }).type;
    return t === "file" || t === "image" || t === "image_url";
  });
}

export function routeChatModel(messages: UIMessage[]): RoutedModel {
  const text = extractLatestUserText(messages);
  const words = text.split(/\s+/).filter(Boolean);
  const chars = text.length;
  const turns = messages.filter((m) => m.role === "user").length;

  // Multimodal or image reasoning -> flagship (strongest vision).
  if (hasImageAttachment(messages)) {
    return {
      tier: "flagship",
      model: FLAGSHIP_MODEL,
      reason: "image attachment",
      fast: true,
    };
  }

  // Trivial greetings / acks / very short messages -> nano.
  if (
    TRIVIAL_PATTERNS.some((rx) => rx.test(text)) ||
    (words.length <= 4 && chars <= 30 && turns <= 2)
  ) {
    return {
      tier: "nano",
      model: NANO_MODEL,
      reason: "short or routine message",
      fast: false,
    };
  }

  const lower = text.toLowerCase();
  const hasComplexKeyword = COMPLEX_KEYWORDS.some((k) => lower.includes(k));
  const isLong = words.length > 60 || chars > 400;
  const isMultiPart =
    /[?!.]\s+[A-Za-z]/.test(text) && text.split(/[?!.]\s+/).filter(Boolean).length >= 3;
  const isDeepThread = turns >= 6;

  if (hasComplexKeyword || isLong || isMultiPart || isDeepThread) {
    return {
      tier: "flagship",
      model: FLAGSHIP_MODEL,
      reason: hasComplexKeyword
        ? "complex request keyword"
        : isLong
          ? "long message"
          : isMultiPart
            ? "multi-part question"
            : "long-running conversation",
      fast: true,
    };
  }

  // Default middle tier for everyday questions.
  return {
    tier: "mini",
    model: MINI_MODEL,
    reason: "everyday question",
    fast: true,
  };
}