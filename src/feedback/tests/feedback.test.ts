import { describe, it, expect } from 'vitest';
import {
  soundManifest,
  validateSoundManifest,
  validateNotificationDescriptors,
  shouldPlaySound,
  createNotificationDeduplicationKey,
  deduplicateNotifications,
  resolveNotificationPresentation,
  NotificationDescriptor,
  SoundPreferences
} from '../index';

describe('Sound Manifest and Validation', () => {
  it('should have unique sound IDs in the manifest', () => {
    const issues = validateSoundManifest(soundManifest);
    const errors = issues.filter(i => i.type === 'error');
    expect(errors).toHaveLength(0);
  });

  it('should detect invalid volume levels in validation', () => {
    const invalidManifest = {
      test_sound: {
        id: 'test_sound',
        filePath: 'path/to/sound.wav',
        category: 'system_warning' as const,
        defaultVolume: 1.5, // Invalid, > 1
        loop: false,
        priority: 'normal' as const,
        accessibilityAlternative: 'Test',
        placeholder: true
      }
    };
    const issues = validateSoundManifest(invalidManifest);
    expect(issues.some(i => i.message.includes('Invalid defaultVolume'))).toBe(true);
  });

  it('should fail if sound ID is missing in manifest for notification', () => {
    const notifications: NotificationDescriptor[] = [{
      type: 'informational',
      severity: 'info',
      title: 'Test',
      message: 'Test message',
      dismissible: true,
      persistenceExpectation: 'ephemeral',
      soundId: 'non_existent_sound',
      screenReaderAnnouncementPriority: 'polite',
      deduplicationKey: 'test-key'
    }];

    const issues = validateNotificationDescriptors(notifications, soundManifest);
    expect(issues.some(i => i.message.includes("missing sound ID: 'non_existent_sound'"))).toBe(true);
  });

  it('should require message on critical notifications', () => {
    const notifications: NotificationDescriptor[] = [{
      type: 'blocking_alert',
      severity: 'critical',
      title: 'Critical Failure',
      message: '', // Invalid, missing detailed message
      dismissible: false,
      persistenceExpectation: 'persistent_until_resolved',
      screenReaderAnnouncementPriority: 'assertive',
      deduplicationKey: 'crit'
    }];

    const issues = validateNotificationDescriptors(notifications, soundManifest);
    expect(issues.some(i => i.message.includes("missing a detailed message alternative"))).toBe(true);
  });
});

describe('Notification Rules (Pure Helpers)', () => {
  const defaultPrefs: SoundPreferences = {
    masterSoundEnabled: true,
    effectsVolume: 1.0,
    notificationVolume: 1.0,
    muteWhileUnfocused: true,
    reducedAudioMode: false,
    screenReaderAnnouncement: 'polite',
    criticalAlertBehavior: 'always_play',
    visualOnlyFeedbackMode: false
  };

  it('should correctly evaluate whether sound should play', () => {
    const notification: NotificationDescriptor = {
      type: 'informational',
      severity: 'info',
      title: 'Info',
      message: 'Info message',
      dismissible: true,
      persistenceExpectation: 'ephemeral',
      soundId: 'task_started_01',
      screenReaderAnnouncementPriority: 'polite',
      deduplicationKey: 'key'
    };

    // Should play normal sound when focused and enabled
    expect(shouldPlaySound(notification, defaultPrefs, soundManifest, true)).toBe(true);

    // Mute unfocused
    expect(shouldPlaySound(notification, defaultPrefs, soundManifest, false)).toBe(false);

    // Master sound disabled
    expect(shouldPlaySound(notification, { ...defaultPrefs, masterSoundEnabled: false }, soundManifest, true)).toBe(false);

    // Visual only mode
    expect(shouldPlaySound(notification, { ...defaultPrefs, visualOnlyFeedbackMode: true }, soundManifest, true)).toBe(false);
  });

  it('should always play critical sounds if preference dictates, even if muted or unfocused', () => {
    const notification: NotificationDescriptor = {
      type: 'blocking_alert',
      severity: 'critical',
      title: 'CRITICAL',
      message: 'STOP',
      dismissible: false,
      persistenceExpectation: 'persistent_until_resolved',
      soundId: 'emergency_stop_01', // Critical priority
      screenReaderAnnouncementPriority: 'assertive',
      deduplicationKey: 'key'
    };

    const mutedPrefs = { ...defaultPrefs, masterSoundEnabled: false };

    // Even if master disabled and unfocused, always play critical
    expect(shouldPlaySound(notification, mutedPrefs, soundManifest, false)).toBe(true);
  });

  it('should suppress noncritical sounds in reduced audio mode', () => {
    const notification: NotificationDescriptor = {
      type: 'informational',
      severity: 'info',
      title: 'Info',
      message: 'Info message',
      dismissible: true,
      persistenceExpectation: 'ephemeral',
      soundId: 'agent_selected_01', // Low priority
      screenReaderAnnouncementPriority: 'polite',
      deduplicationKey: 'key'
    };

    const reducedAudioPrefs = { ...defaultPrefs, reducedAudioMode: true };
    expect(shouldPlaySound(notification, reducedAudioPrefs, soundManifest, true)).toBe(false);
  });

  it('should deduplicate notifications using their key', () => {
    const key1 = createNotificationDeduplicationKey('task_failed', 'task-1');
    const key2 = createNotificationDeduplicationKey('task_started', 'task-2');

    const notifs: NotificationDescriptor[] = [
      { type: 'error', severity: 'error', title: 'A', message: 'A', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 },
      { type: 'informational', severity: 'info', title: 'B', message: 'B', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key2 },
      { type: 'error', severity: 'error', title: 'C', message: 'C', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 }
    ];

    const deduped = deduplicateNotifications(notifs);
    expect(deduped).toHaveLength(2);
    // Last occurrence should overwrite the first
    expect(deduped.find(n => n.deduplicationKey === key1)?.title).toBe('C');
  });

  it('should resolve presentation correctly without mutation', () => {
    const notification: NotificationDescriptor = {
      type: 'recovery_required',
      severity: 'warning',
      title: 'Recovery',
      message: 'Agent stuck',
      dismissible: true,
      persistenceExpectation: 'persistent_until_resolved',
      screenReaderAnnouncementPriority: 'assertive',
      deduplicationKey: 'recovery-1'
    };

    const original = { ...notification };
    const presentation = resolveNotificationPresentation(notification, defaultPrefs);

    expect(presentation.requiresExplicitDismissal).toBe(true); // Due to recovery required or persistence logic
    expect(presentation.announcementPriority).toBe('assertive');
    expect(notification).toEqual(original); // Ensure input not mutated
  });
});
