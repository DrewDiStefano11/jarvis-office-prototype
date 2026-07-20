# Accessibility Foundation

This document outlines the core accessibility conventions and pure logic contracts designed to make the Jarvis Office Prototype accessible to all users.

## Keyboard-Control Conventions

We've defined framework-independent keyboard commands to ensure consistent interaction across the application without coupling them to specific UI implementations right away.

- **Move focus:** Arrow keys navigate between agents.
- **Select / Open details:** Enter / Space are the standard selection actions.
- **Task Controls:** Custom hotkeys for start (s), pause (p), resume (r), and cancel (c) actions.
- **Global Actions:** Escape closes active panels, 'n' opens notifications, and Delete triggers an emergency stop.

These are defined in `src/accessibility/commands.ts`.

## Focus-Management Rules

Focus logic is implemented as **pure functions** that do not depend on DOM globals or internal app state.

- **Disabled Targets:** Focus targets that are disabled are automatically and deterministically skipped.
- **Roving Focus:** Roving tab index is supported; only one enabled target typically receives `tabIndex=0`, and the rest get `-1`.
- **Wrapping:** Navigation naturally wraps around bounds (e.g. going "next" from the last enabled target wraps to the first).

*Note:* We explicitly defer the actual DOM focus manipulation. In a future PR, a React adapter will be created that uses these pure helpers to identify the next target and call `.focus()` on the corresponding HTML element.

## Screen-Reader Announcement Policy

To unify communication, announcements have stable IDs and predefined politeness levels (either `polite` or `assertive`). They include deduplication keys so repeated redundant events don't spam the screen reader.

- `assertive` is strictly used for failures, blocks, emergency states, and required actions.
- `polite` is used for general status changes, progress, and selections.

These definitions reside in `src/accessibility/announcements.ts`.

## Reduced-Motion Policy

The motion policy is a configurable set of rules (found in `src/accessibility/reducedMotion.ts`) designed to transform motion requests based on user preferences.

- **Decorative Motion:** Immediately disabled if the policy prefers reduced motion.
- **Flashing & Parallax:** Strictly suppressed.
- **Continuous Movement:** Replaced with static indicators or periodic discrete updates.
- **Essential Progress Feedback:** Must be preserved, either by significantly simplifying the transition (keeping it under max duration limits) or using a non-motion fallback (text update).

## High-Contrast Expectations & Status Communication

Future rendering elements should ensure high contrast compatibility and must not rely entirely on color to communicate status. Non-visual alternatives (like static icons, readable text descriptors, or patterns) should always accompany color-coded indicators.

## Mobile and Touch Considerations

The commands defined are modeled heavily on keyboard interactions, but these standard intents (e.g., "select agent", "open panel") map 1-to-1 with touch interactions. Future touch integration can map tap/swipe gestures to the same pure command IDs.

## Future Integration / Deferred Work

This PR establishes **only** the pure foundation and avoids directly modifying runtime features.

**Deferred Work Includes:**
- A full accessibility settings UI (persisting user preferences).
- Wiring standard commands to the EventBus.
- Phaser input integration for selecting sprites.
- React hooks / DOM adapters for actual element focusing.
- Audio implementation for non-visual cues.

This intentional separation ensures our accessibility logic is rigorously unit testable and decoupled from active visualization choices.
