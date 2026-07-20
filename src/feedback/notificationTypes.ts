export type NotificationType =
  | 'informational'
  | 'success'
  | 'warning'
  | 'error'
  | 'blocking_alert'
  | 'approval_request'
  | 'recovery_required';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';

export type PersistenceExpectation =
  | 'ephemeral'
  | 'persistent_until_dismissed'
  | 'persistent_until_resolved';

export interface NotificationDescriptor {
  /** The semantic type of the notification. */
  type: NotificationType;
  /** Importance/severity level. */
  severity: NotificationSeverity;
  /** Short summary of the notification. */
  title: string;
  /** Detailed description or message body. */
  message: string;

  /** Optional ID of an agent relevant to this notification. */
  agentId?: string;
  /** Optional ID of a task relevant to this notification. */
  taskId?: string;

  /** Whether the user is allowed to manually dismiss the notification. */
  dismissible: boolean;
  /** Rule for how long the notification should stay active. */
  persistenceExpectation: PersistenceExpectation;

  /** Optional ID of the sound to play when this notification appears. */
  soundId?: string;
  /** Optional ID of a visual indicator to show. */
  visualIndicatorId?: string;

  /** Priority level for screen reader announcements. */
  screenReaderAnnouncementPriority: 'polite' | 'assertive';

  /** Stable key used for deduplicating repeated similar notifications. */
  deduplicationKey: string;

  /** Optional policy: automatically expire/dismiss after N milliseconds. */
  expirationPolicyMs?: number;
}
