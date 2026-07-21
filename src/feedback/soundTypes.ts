export type SoundCategoryId =
  | 'task_started'
  | 'task_completed'
  | 'task_paused'
  | 'task_blocked'
  | 'task_failed'
  | 'approval_requested'
  | 'notification_received'
  | 'agent_selected'
  | 'room_transition'
  | 'system_warning'
  | 'emergency_stop';

export type SoundPriority = 'low' | 'normal' | 'high' | 'critical';

export interface SoundDefinition {
  /** Stable unique identifier for the sound. */
  id: string;
  /** File path for the sound asset (can be a future path for placeholders). */
  filePath: string;
  /** The semantic category of the sound. */
  category: SoundCategoryId;
  /** Default volume for the sound (0.0 to 1.0). */
  defaultVolume: number;
  /** Whether the sound should loop until explicitly stopped. */
  loop: boolean;
  /** Importance priority for conflict resolution and accessibility behavior. */
  priority: SoundPriority;
  /** Minimum time in milliseconds before this sound can be played again. */
  cooldownPolicyMs?: number;
  /** Maximum number of simultaneous instances of this specific sound. */
  maxSimultaneous?: number;
  /** Text alternative for accessibility (screen readers, visual-only mode). */
  accessibilityAlternative: string;
  /** True if this entry represents a placeholder without a guaranteed runtime asset. */
  placeholder: boolean;
  /** Optional metadata describing the length of the sound in milliseconds. */
  durationMs?: number;
}

export interface SoundPreferences {
  /** Master toggle for all sounds, including critical alerts. */
  masterSoundEnabled: boolean;
  /** Volume multiplier for general effects (0.0 to 1.0). */
  effectsVolume: number;
  /** Volume multiplier specifically for notifications (0.0 to 1.0). */
  notificationVolume: number;
  /** If true, sound should be muted when the window/app loses focus. */
  muteWhileUnfocused: boolean;
  /** If true, uses a minimal set of sounds and avoids startling audio. */
  reducedAudioMode: boolean;
  /**
   * Preferences for how screen readers should behave
   * (e.g., 'polite' vs 'assertive' overrides).
   */
  screenReaderAnnouncement: 'polite' | 'assertive' | 'off';
  /**
   * Allows critical alerts to bypass reduced-audio and unfocused-window
   * suppression, but never visual-only mode or explicit master mute.
   */
  criticalAlertBehavior: 'always_play' | 'respect_mute';
  /** Disables all audio and relies on visual/text alternatives. */
  visualOnlyFeedbackMode: boolean;
}
