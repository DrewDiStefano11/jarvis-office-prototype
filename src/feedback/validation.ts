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

    if (!notification.title || notification.title.trim() === '') {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Notification is missing a title.`
      });
    }

    if (!notification.message || notification.message.trim() === '') {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Notification is missing a message.`
      });
    }

    const validTypes = ['informational', 'success', 'warning', 'error', 'blocking_alert', 'approval_request', 'recovery_required'];
    if (!validTypes.includes(notification.type)) {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Invalid notification type: '${notification.type}'.`
      });
    }

    const validSeverities = ['info', 'success', 'warning', 'error', 'critical'];
    if (!validSeverities.includes(notification.severity)) {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Invalid notification severity: '${notification.severity}'.`
      });
    }

    const validPersistence = ['ephemeral', 'persistent_until_dismissed', 'persistent_until_resolved'];
    if (!validPersistence.includes(notification.persistenceExpectation)) {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Invalid notification persistenceExpectation: '${notification.persistenceExpectation}'.`
      });
    }

    // Relying only on sound/color logic constraint check via textual alternative fields existing
    if ((notification.severity === 'critical' || notification.type === 'recovery_required') && (!notification.message || notification.message.trim() === '')) {
      issues.push({
        id: contextId,
        type: 'error',
        message: `Critical and recovery-required notifications must provide non-audio readable text alternatives (message).`
      });
    }

    if (notification.type === 'recovery_required') {
      if (notification.severity !== 'warning' && notification.severity !== 'error') {
         issues.push({
          id: contextId,
          type: 'error',
          message: `Recovery required notifications must use 'warning' or 'error' severity. Found: '${notification.severity}'`
        });
      }
      if (!notification.workflowOrIncidentId || notification.workflowOrIncidentId.trim() === '') {
        issues.push({
          id: contextId,
          type: 'error',
          message: `Recovery required notifications must provide a valid workflowOrIncidentId.`
        });
      }
      if (notification.persistenceExpectation === 'ephemeral') {
        issues.push({
          id: contextId,
          type: 'error',
          message: `Recovery required notifications cannot be ephemeral.`
        });
      }
      if (!notification.deduplicationKey.includes('incident:') && !notification.deduplicationKey.includes('workflow:')) {
        issues.push({
          id: contextId,
          type: 'warning',
          message: `Recovery required notifications should typically use a stable incident or workflow identity in their deduplication key.`
        });
      }
    }

    if (notification.taskId && !notification.deduplicationKey.includes('task:')) {
      issues.push({
        id: contextId,
        type: 'warning',
        message: `Notification has taskId but deduplicationKey does not contain 'task:'.`
      });
    }

    if (notification.agentId && !notification.deduplicationKey.includes('agent:')) {
      issues.push({
        id: contextId,
        type: 'warning',
        message: `Notification has agentId but deduplicationKey does not contain 'agent:'.`
      });
    }

    if (notification.workflowOrIncidentId && !notification.deduplicationKey.includes('incident:')) {
      issues.push({
        id: contextId,
        type: 'warning',
        message: `Notification has workflowOrIncidentId but deduplicationKey does not contain 'incident:'.`
      });
    }

    if (notification.type !== 'recovery_required' && notification.severity === 'critical' && notification.persistenceExpectation !== 'persistent_until_resolved') {
      issues.push({
        id: contextId,
        type: 'warning',
        message: `Emergency-stop / critical notifications typically should persist until resolved.`
      });
    }

    if (notification.type !== 'recovery_required' && notification.deduplicationKey.includes('recovery-')) {
       issues.push({
        id: contextId,
        type: 'warning',
        message: `Emergency-stop incorrectly sharing recovery deduplication behavior.`
      });
    }
  }

  return issues;
}
