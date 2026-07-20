# Sound and Notifications Specifications

This document outlines the foundation for sound and notification policies within the office prototype. This foundation aims to provide additive definitions, validation, and presentation resolution logic without immediately connecting these events to the runtime environment.

## Sound Categories and Severities

The specification categorizes sounds and notifications by semantic meaning rather than just visual or audio characteristics.

### Sound Categories
- `task_started`
- `task_completed`
- `task_paused`
- `task_blocked`
- `task_failed`
- `approval_requested`
- `notification_received`
- `agent_selected`
- `room_transition`
- `system_warning`
- `emergency_stop`

### Notification Severities
- `info`: General operational awareness.
- `success`: A positive resolution of a task or action.
- `warning`: Attention needed, but not immediately critical.
- `error`: Action failed or unrecoverable state reached.
- `critical`: High-priority interruption (e.g., Emergency Stop).

## Stable ID Conventions
Sound definitions and notification descriptors rely on stable identifiers (e.g., `task_started_01`). These IDs link declarative notification policies to actual audio files. The notification types themselves are also deterministically tied to deduplication keys to ensure robust tracking and updates across multiple snapshots of application state without generating redundant UI elements.

## Preference Model
To accommodate accessibility, environment rules, and user focus, the sound model is strictly governed by a declarative user preference structure (`SoundPreferences`). This includes:
- Master mute controls.
- Distinct effect and notification volume bounds.
- Window focus detection (muting when unfocused).
- A reduced audio mode (suppressing low/normal priority sounds).
- Visual-only feedback overrides.

## Accessibility Requirements
- All non-ephemeral or non-visual data conveyed through sound must have a robust text-based alternative (e.g., screen reader announcements, detailed descriptions).
- Visual-only modes guarantee that relying solely on UI indicators continues to meet operation constraints.
- Screen reader policies default to polite, but escalate to assertive dynamically for warnings, errors, and critical stops.

## Original-Placeholder Policy
The current implementation utilizes **silent placeholder entries**. Actual audio files (`.wav` or `.ogg`) will be stored under `public/assets/office/sounds/`.
When asset generation occurs in the future, adhere to these guidelines:
- **Interaction cues:** 100–250 ms
- **Success and completion cues:** 250–600 ms
- **Warning cues:** 300–800 ms
- **Critical or emergency cues:** Short, distinct, and non-looping by default.
- No essential information should ever be communicated through sound alone.
- Placeholders must not require runtime external audio dependencies.

## Architecture and Future Integrations
To maintain strict boundaries, the current `src/feedback` specification is decoupled from active framework engines.

**Future React Integration:**
- React components will use `notificationRules.ts` helpers to resolve visual states and announcement strings.
- Notification stores will utilize `deduplicateNotifications` when consuming snapshots to ensure the UI updates an existing alert rather than flooding the screen.

**Future Phaser Integration:**
- Phaser is strictly a renderer. Audio will be played through browser Web Audio APIs or standard HTML5 Audio controlled by React or the Core Domain manager, not Phaser’s scene graph.
- Phaser may trigger generic event emitters referencing semantic tags (like `agent_selected`), but the validation against `soundManifest` and the user's `SoundPreferences` will happen at the boundary layer before the audio plays.

## Exclusions & Deferred Work
This pull request intentionally defers:
- **Live browser audio playback:** No audio contexts are created.
- **React settings panels:** The UI for manipulating `SoundPreferences` is omitted.
- **Phaser audio integration:** Phaser is not instructed to preload these sound assets.
- **EventBus subscriptions:** The system does not subscribe to active domain tasks.
- **External Dependencies:** No audio library or external AI API calls were implemented for sounds.
