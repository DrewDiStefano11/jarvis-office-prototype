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

## Preference Model & Sound Precedence
To accommodate accessibility, environment rules, and user focus, the sound model is strictly governed by a declarative user preference structure (`SoundPreferences`).
Precedence is strictly enforced in this order:
1. `visualOnlyFeedbackMode`: When enabled, absolute suppression of all sound occurs.
2. `masterSoundEnabled`: When disabled, absolute suppression of all sound occurs.
3. If no valid sound exists on the notification, no sound plays.
4. Window focus (`muteWhileUnfocused`) and reduced audio (`reducedAudioMode`) policies are then evaluated.
5. Finally, `criticalAlertBehavior` may override **only** the unfocused or reduced audio suppression. Critical alerts can **never** bypass visual-only mode or the master mute toggle.

## Accessibility Requirements & Announcements
- All non-ephemeral or non-visual data conveyed through sound must have a robust text-based alternative (e.g., screen reader announcements, detailed descriptions).
- Visual-only modes guarantee that relying solely on UI indicators continues to meet operation constraints.

### Announcement Resolution & Material Equivalence
The `resolveNotificationPresentation` helper strictly controls screen reader announcements and relies on a `NotificationPresentationContext` API (containing `hasBeenPresented` and `previousDescriptor`) to remain deterministic and stateless:
- **Unchanged Duplicates:** If an incident (tracked via `deduplicationKey`) has been presented and is materially identical to the last snapshot, announcements are explicitly set to `"off"`.
- **Material Changes:** If an incident has been presented but changes in a material way (title, message, severity, available actions), it is politely re-announced, escalating to `"assertive"` only if the severity is error or critical.
- **New Incidents:** Completely new deduplication keys trigger standard announcement flows, with `recovery_required` and `critical` alerts asserting themselves.
This ensures repeated React snapshots of the same ongoing task or recovery state don't flood the user with redundant assertive announcements.

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
