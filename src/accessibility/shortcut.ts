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

  const allowedSpecialKeys = new Set([
    "arrowup", "arrowdown", "arrowleft", "arrowright",
    "enter", "space", "escape", "tab", "home", "end",
    "delete", "backspace", "pageup", "pagedown", "insert",
    "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"
  ]);

  const isSingleLetter = /^[a-z]$/.test(key);
  const isDigit = /^[0-9]$/.test(key);

  if (!isSingleLetter && !isDigit && !allowedSpecialKeys.has(key)) {
    return { isValid: false, error: `Shortcut contains an unsupported or unknown named key: "${key}".` };
  }

  // Canonical modifier order: Ctrl, Alt, Shift, Meta
  const canonicalModifiers = [];
  if (modifiers.has("ctrl")) canonicalModifiers.push("Ctrl");
  if (modifiers.has("alt")) canonicalModifiers.push("Alt");
  if (modifiers.has("shift")) canonicalModifiers.push("Shift");
  if (modifiers.has("meta")) canonicalModifiers.push("Meta");

  // Key normalization
  let normalizedKey = key;
  if (isSingleLetter) {
    normalizedKey = key.toUpperCase();
  } else if (/^f\d+$/.test(key)) {
    normalizedKey = key.toUpperCase();
  } else if (key.startsWith("arrow") || key.startsWith("page")) {
    // ArrowUp, PageDown etc.
    if (key.startsWith("arrow")) {
       normalizedKey = "Arrow" + key.slice(5).charAt(0).toUpperCase() + key.slice(6);
    } else {
       normalizedKey = "Page" + key.slice(4).charAt(0).toUpperCase() + key.slice(5);
    }
  } else {
    normalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
  }

  const normalized = [...canonicalModifiers, normalizedKey].join("+");

  return { isValid: true, normalized };
}
