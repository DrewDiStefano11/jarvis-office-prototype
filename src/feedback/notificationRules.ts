import {
  NotificationDescriptor,
  NotificationPresentationContext,
  NotificationSeverity,
  ResolvedNotificationPresentation,
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
/**
 * Determines whether two notifications are materially equivalent.
 * Material equivalence ignores timestamps, exact identity references if irrelevant,
 * and ephemeral changes that don't constitute a meaningful state update.
 * Differences in title, message, severity, or actions are material.
 */
export function areNotificationsMateriallyEquivalent(
  a: NotificationDescriptor,
  b: NotificationDescriptor
): boolean {
  if (a.deduplicationKey !== b.deduplicationKey) return false;
  if (a.type !== b.type) return false;
  if (a.severity !== b.severity) return false;
  if (a.title !== b.title) return false;
  if (a.message !== b.message) return false;
  if (a.persistenceExpectation !== b.persistenceExpectation) return false;
  if (a.dismissible !== b.dismissible) return false;

  if (a.taskId !== b.taskId) return false;
  if (a.agentId !== b.agentId) return false;
  if (a.workflowOrIncidentId !== b.workflowOrIncidentId) return false;

  if (a.soundId !== b.soundId) return false;
  if (a.visualIndicatorId !== b.visualIndicatorId) return false;

  // If there are ever interactive action descriptors, we would deep compare them here.
  return true;
}

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
  preferences: SoundPreferences,
  context: NotificationPresentationContext,
  soundManifest: Record<string, SoundDefinition>,
  windowIsFocused: boolean
): ResolvedNotificationPresentation {
  const isCriticalOrError = notification.severity === 'critical' || notification.severity === 'error';
  const isRecoveryRequired = notification.type === 'recovery_required';

  // A completely new incident exists if there is no previous descriptor, or if the deduplication keys mismatch,
  // or if the workflow/incident IDs fundamentally mismatch.
  const isNewIncident = !context.previousDescriptor ||
                        context.previousDescriptor.deduplicationKey !== notification.deduplicationKey ||
                        context.previousDescriptor.workflowOrIncidentId !== notification.workflowOrIncidentId;

  // If not a new incident, determine material change status compared to previous descriptor
  const isMateriallyChanged = !isNewIncident && !areNotificationsMateriallyEquivalent(notification, context.previousDescriptor!);

  let announcementPriority: 'polite' | 'assertive' | 'off' = notification.screenReaderAnnouncementPriority;
  let shouldAnnounce = true;

  if (isNewIncident) {
    if (isRecoveryRequired || isCriticalOrError) {
      announcementPriority = 'assertive';
    }
  } else if (isMateriallyChanged) {
    // Materially changed same incident: announce politely by default, escalate if error/critical
    if (isCriticalOrError) {
      announcementPriority = 'assertive';
    } else {
      announcementPriority = 'polite';
    }
  } else {
    // Unchanged duplicate: do not announce
    shouldAnnounce = false;
    announcementPriority = 'off';
  }

  // User preferences override everything else
  if (preferences.screenReaderAnnouncement === 'off') {
    announcementPriority = 'off';
    shouldAnnounce = false;
  } else if (preferences.screenReaderAnnouncement === 'assertive' && shouldAnnounce) {
    announcementPriority = 'assertive';
  }

  return {
    shouldPlaySound: shouldPlaySound(notification, preferences, soundManifest, windowIsFocused),
    shouldAnnounce,
    announcementPriority,
    announcementText: shouldAnnounce ? `${notification.title}: ${notification.message}` : null,
    persistenceExpectation: notification.persistenceExpectation,
    visualSeverity: notification.severity,
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
