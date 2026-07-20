// A pure module for keyboard shortcut normalization and parsing.

const ALLOWED_MODIFIERS = new Set(["ctrl", "alt", "shift", "meta"]);

export interface NormalizedShortcutResult {
  readonly isValid: boolean;
  readonly normalized?: string;
  readonly error?: string;
}

export function normalizeShortcut(shortcut: string): NormalizedShortcutResult {
  if (!shortcut || shortcut.trim() === "") {
    return { isValid: false, error: "Shortcut cannot be empty or whitespace-only." };
  }

  const parts = shortcut.split("+").map(p => p.trim().toLowerCase());

  if (parts.some(p => p === "")) {
    return { isValid: false, error: "Shortcut contains malformed separators or empty parts." };
  }

  const modifiers = new Set<string>();
  const keys: string[] = [];

  for (const part of parts) {
    if (ALLOWED_MODIFIERS.has(part)) {
      if (modifiers.has(part)) {
        return { isValid: false, error: `Duplicate modifier found: ${part}.` };
      }
      modifiers.add(part);
    } else {
      keys.push(part);
    }
  }

  if (keys.length === 0) {
    return { isValid: false, error: "Shortcut is missing a final key." };
  }

  if (keys.length > 1) {
    return { isValid: false, error: "Shortcut contains more than one non-modifier key." };
  }

  const key = keys[0];

  // Canonical modifier order: Ctrl, Alt, Shift, Meta
  const canonicalModifiers = [];
  if (modifiers.has("ctrl")) canonicalModifiers.push("Ctrl");
  if (modifiers.has("alt")) canonicalModifiers.push("Alt");
  if (modifiers.has("shift")) canonicalModifiers.push("Shift");
  if (modifiers.has("meta")) canonicalModifiers.push("Meta");

  // Key normalization: Capitalize single letters, otherwise title case (e.g., enter -> Enter)
  let normalizedKey = key;
  if (key.length === 1) {
    normalizedKey = key.toUpperCase();
  } else {
    normalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
  }

  const normalized = [...canonicalModifiers, normalizedKey].join("+");

  return { isValid: true, normalized };
}
