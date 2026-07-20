import {
  NotificationDescriptor,
  NotificationSeverity,
} from './notificationTypes';
import { SoundDefinition, SoundPreferences } from './soundTypes';

/**
 * Creates a stable deduplication key for a notification based on its core identity.
 */
export function createNotificationDeduplicationKey(
  type: string,
  taskId?: string,
  agentId?: string,
  workflowOrIncidentId?: string
): string {
  const parts = [type];
  if (workflowOrIncidentId) {
    parts.push(`incident:${workflowOrIncidentId}`);
  }
  if (taskId) {
    parts.push(`task:${taskId}`);
  }
  if (agentId) {
    parts.push(`agent:${agentId}`);
  }
  return parts.join('|');
}

/**
 * Deduplicates a list of notifications, keeping only the latest of each deduplication key.
 * Ordering contract: Retained descriptors are ordered by their latest occurrence in the input array.
 * If a deduplication key appears multiple times, its position is moved to the end of the list.
 * Does not mutate the input array.
 */
export function deduplicateNotifications(
  notifications: NotificationDescriptor[]
): NotificationDescriptor[] {
  const map = new Map<string, NotificationDescriptor>();
  for (const notification of notifications) {
    // Delete existing to ensure the new insertion moves it to the end of the Map's iteration order
    if (map.has(notification.deduplicationKey)) {
      map.delete(notification.deduplicationKey);
    }
    map.set(notification.deduplicationKey, notification);
  }
  return Array.from(map.values());
}

/**
 * Determines whether a sound should play based on the notification, the sound manifest, and user preferences.
 */
export function shouldPlaySound(
  notification: NotificationDescriptor,
  preferences: SoundPreferences,
  soundManifest: Record<string, SoundDefinition>,
  windowIsFocused: boolean
): boolean {
  // 1. If visualOnlyFeedbackMode is enabled, play no sound.
  if (preferences.visualOnlyFeedbackMode) {
    return false;
  }

  // 2. If masterSoundEnabled is false, play no sound.
  if (!preferences.masterSoundEnabled) {
    return false;
  }

  // 3. If the notification has no valid sound, play no sound.
  if (!notification.soundId) return false;

  const soundDef = soundManifest[notification.soundId];
  if (!soundDef) return false;

  // 4 & 5. Evaluate lower precedence rules (unfocused and reduced audio)
  let wouldPlay = true;

  if (preferences.muteWhileUnfocused && !windowIsFocused) {
    wouldPlay = false;
  } else if (preferences.reducedAudioMode && (soundDef.priority === 'low' || soundDef.priority === 'normal')) {
    wouldPlay = false;
  }

  // 6. Apply critical-alert behavior only within the remaining permitted audio policy.
  // This means it can bypass unfocused or reduced audio, but NOT visualOnly or master mute (which were returned early)
  if (!wouldPlay && soundDef.priority === 'critical') {
    if (preferences.criticalAlertBehavior === 'always_play') {
      return true;
    }
  }

  return wouldPlay;
}

/**
 * Resolves the presentation rules for a specific notification descriptor.
 * This determines final visual and interaction states without mutating the original.
 */
export function resolveNotificationPresentation(
  notification: NotificationDescriptor,
  preferences: SoundPreferences
): {
  showVisualIndicator: boolean;
  announcementText: string | null;
  announcementPriority: 'polite' | 'assertive' | 'off';
  requiresExplicitDismissal: boolean;
} {
  const isCriticalOrError = notification.severity === 'critical' || notification.severity === 'error';
  const isRecoveryRequired = notification.type === 'recovery_required';

  let announcementPriority: 'polite' | 'assertive' | 'off' = notification.screenReaderAnnouncementPriority;
  if (preferences.screenReaderAnnouncement === 'off') {
    announcementPriority = 'off';
  } else if (preferences.screenReaderAnnouncement === 'assertive') {
    announcementPriority = 'assertive';
  }

  return {
    showVisualIndicator: true,
    announcementText: `${notification.title}: ${notification.message}`,
    announcementPriority,
    requiresExplicitDismissal: !notification.dismissible ||
                               notification.persistenceExpectation === 'persistent_until_dismissed' ||
                               notification.persistenceExpectation === 'persistent_until_resolved' ||
                               isRecoveryRequired ||
                               isCriticalOrError
  };
}

/**
 * Resolves which sound ID to use for a notification based on its severity,
 * if one wasn't explicitly provided, falling back to a default logic.
 */
export function resolveSoundForNotification(
  notification: NotificationDescriptor,
  defaultRules: Record<NotificationSeverity, string | null>
): string | null {
  if (notification.soundId) {
    return notification.soundId;
  }

  return defaultRules[notification.severity] || null;
}
