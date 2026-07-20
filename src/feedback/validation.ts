import { NotificationDescriptor } from './notificationTypes';
import { SoundDefinition } from './soundTypes';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning';
  message: string;
}

/**
 * Validates a sound manifest for issues like invalid bounds, missing files (if not placeholder), etc.
 */
export function validateSoundManifest(manifest: Record<string, SoundDefinition>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const [key, sound] of Object.entries(manifest)) {
    if (key !== sound.id) {
      issues.push({ id: sound.id, type: 'error', message: `Manifest key '${key}' does not match sound ID '${sound.id}'` });
    }

    if (seenIds.has(sound.id)) {
      issues.push({ id: sound.id, type: 'error', message: `Duplicate sound ID found: '${sound.id}'` });
    }
    seenIds.add(sound.id);

    if (sound.defaultVolume < 0 || sound.defaultVolume > 1) {
      issues.push({ id: sound.id, type: 'error', message: `Invalid defaultVolume ${sound.defaultVolume} for sound '${sound.id}'. Must be between 0 and 1.` });
    }

    if (!sound.accessibilityAlternative || sound.accessibilityAlternative.trim() === '') {
      issues.push({ id: sound.id, type: 'error', message: `Sound '${sound.id}' is missing an accessibility alternative text.` });
    }

    if (!sound.filePath || sound.filePath.trim() === '') {
      issues.push({ id: sound.id, type: 'error', message: `Sound '${sound.id}' is missing a filePath.` });
    }

    if (sound.filePath && sound.filePath.startsWith('public/')) {
      issues.push({ id: sound.id, type: 'error', message: `Sound '${sound.id}' filePath must not contain the 'public/' repository prefix. Browser paths start with 'assets/'.` });
    }

    if (sound.durationMs !== undefined && sound.durationMs <= 0) {
      issues.push({ id: sound.id, type: 'error', message: `Sound '${sound.id}' durationMs must be positive.` });
    }

    if (sound.cooldownPolicyMs !== undefined && sound.cooldownPolicyMs <= 0) {
      issues.push({ id: sound.id, type: 'error', message: `Sound '${sound.id}' cooldownPolicyMs must be positive.` });
    }

    if (sound.maxSimultaneous !== undefined && sound.maxSimultaneous <= 0) {
      issues.push({ id: sound.id, type: 'error', message: `Sound '${sound.id}' maxSimultaneous must be positive.` });
    }

    const validCategories = ['task_started', 'task_completed', 'task_paused', 'task_blocked', 'task_failed', 'approval_requested', 'notification_received', 'agent_selected', 'room_transition', 'system_warning', 'emergency_stop'];
    if (!validCategories.includes(sound.category)) {
      issues.push({ id: sound.id, type: 'error', message: `Sound '${sound.id}' category '${sound.category}' is not supported.` });
    }
  }

  return issues;
}

/**
 * Validates a set of notification rules/descriptors against a sound manifest, ensuring valid references.
 */
export function validateNotificationDescriptors(
  notifications: NotificationDescriptor[],
  soundManifest: Record<string, SoundDefinition>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const notification of notifications) {
    const contextId = notification.deduplicationKey || 'unknown-notification';

    if (!notification.deduplicationKey || notification.deduplicationKey.trim() === '') {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Notification is missing a deduplication key.`
      });
    }

    if (notification.expirationPolicyMs !== undefined && notification.expirationPolicyMs <= 0) {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Notification expirationPolicyMs must be positive.`
      });
    }

    if (notification.soundId && !soundManifest[notification.soundId]) {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Notification references missing sound ID: '${notification.soundId}'`
      });
    }

    if ((notification.severity === 'critical' || notification.type === 'recovery_required') && (!notification.message || notification.message.trim() === '')) {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Critical and recovery-required notifications must provide non-audio readable text alternatives (message).`
      });
    }

    if (notification.type === 'recovery_required' && notification.severity !== 'warning' && notification.severity !== 'error') {
       issues.push({
        id: contextId,
        type: 'error',
        message: `Recovery required notifications must use 'warning' or 'error' severity. Found: '${notification.severity}'`
      });
    }
  }

  return issues;
}
