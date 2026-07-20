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
 * Preserves the order of appearance of the newest items.
 */
export function deduplicateNotifications(
  notifications: NotificationDescriptor[]
): NotificationDescriptor[] {
  const map = new Map<string, NotificationDescriptor>();
  // Processing in order means later occurrences of the same key will overwrite earlier ones.
  for (const notification of notifications) {
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
  if (!notification.soundId) return false;

  const soundDef = soundManifest[notification.soundId];
  if (!soundDef) return false;

  // Critical alerts behavior
  if (soundDef.priority === 'critical') {
    if (preferences.criticalAlertBehavior === 'always_play') {
      return true;
    }
  }

  // Visual only mode overrides general sounds
  if (preferences.visualOnlyFeedbackMode) {
    return false;
  }

  // Master sound disabled
  if (!preferences.masterSoundEnabled) {
    return false;
  }

  // Mute while unfocused check
  if (preferences.muteWhileUnfocused && !windowIsFocused) {
    return false;
  }

  // Reduced audio mode check - filter out non-essential sounds
  if (preferences.reducedAudioMode && (soundDef.priority === 'low' || soundDef.priority === 'normal')) {
    return false;
  }

  return true;
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
