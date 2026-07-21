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

  it('should detect invalid properties in validation (volume, duration, cooldown, path)', () => {
    const invalidManifest = {
      test_sound: {
        id: 'test_sound',
        filePath: 'public/path/to/sound.wav', // invalid prefix
        category: 'system_warning' as const,
        defaultVolume: 1.5, // Invalid, > 1
        loop: false,
        priority: 'normal' as const,
        accessibilityAlternative: 'Test',
        placeholder: true,
        durationMs: -10, // Invalid
        cooldownPolicyMs: 0, // Invalid
        maxSimultaneous: -1 // Invalid
      }
    };
    const issues = validateSoundManifest(invalidManifest);
    expect(issues.some(i => i.message.includes('Invalid defaultVolume'))).toBe(true);
    expect(issues.some(i => i.message.includes("must not contain the 'public/'"))).toBe(true);
    expect(issues.some(i => i.message.includes('durationMs must be positive'))).toBe(true);
    expect(issues.some(i => i.message.includes('cooldownPolicyMs must be positive'))).toBe(true);
    expect(issues.some(i => i.message.includes('maxSimultaneous must be positive'))).toBe(true);
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

  it('should require message on critical and recovery-required notifications', () => {
    const notifications: NotificationDescriptor[] = [{
      type: 'recovery_required',
      severity: 'warning',
      title: 'Critical Failure',
      message: '', // Invalid, missing detailed message
      dismissible: false,
      persistenceExpectation: 'persistent_until_resolved',
      screenReaderAnnouncementPriority: 'assertive',
      deduplicationKey: 'crit'
    }];

    const issues = validateNotificationDescriptors(notifications, soundManifest);
    expect(issues.some(i => i.message.includes("must provide non-audio readable text alternatives"))).toBe(true);
  });

  describe('Recovery Validation Edge Cases', () => {
    it('should detect missing recovery identity as validation error', () => {
      const notifications: NotificationDescriptor[] = [{
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1'
        // Missing workflowOrIncidentId
      }];
      const issues = validateNotificationDescriptors(notifications, soundManifest);
      expect(issues.some(i => i.message.includes("must provide a valid workflowOrIncidentId"))).toBe(true);
    });

    it('should detect whitespace-only recovery identity as validation error', () => {
      const notifications: NotificationDescriptor[] = [{
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1',
        workflowOrIncidentId: '   ' // Whitespace only
      }];
      const issues = validateNotificationDescriptors(notifications, soundManifest);
      expect(issues.some(i => i.message.includes("must provide a valid workflowOrIncidentId"))).toBe(true);
    });

    it('should detect ephemeral recovery notification as validation error', () => {
      const notifications: NotificationDescriptor[] = [{
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'ephemeral', // Invalid for recovery
        screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1',
        workflowOrIncidentId: 'inc-1'
      }];
      const issues = validateNotificationDescriptors(notifications, soundManifest);
      expect(issues.some(i => i.message.includes("Recovery required notifications cannot be ephemeral"))).toBe(true);
    });
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

  it('should respect critical alerts over unfocused, but NOT over visual-only or master mute', () => {
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

    // 1. Critical bypasses unfocused
    expect(shouldPlaySound(notification, { ...defaultPrefs, muteWhileUnfocused: true }, soundManifest, false)).toBe(true);

    // 2. Critical bypasses reduced audio mode
    expect(shouldPlaySound(notification, { ...defaultPrefs, reducedAudioMode: true }, soundManifest, true)).toBe(true);

    // 3. Visual only suppresses critical
    expect(shouldPlaySound(notification, { ...defaultPrefs, visualOnlyFeedbackMode: true }, soundManifest, true)).toBe(false);

    // 4. Master mute suppresses critical
    expect(shouldPlaySound(notification, { ...defaultPrefs, masterSoundEnabled: false }, soundManifest, true)).toBe(false);
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

  it('should deduplicate notifications using their key, maintaining latest-occurrence order', () => {
    const key1 = createNotificationDeduplicationKey('task_failed', 'task-1');
    const key2 = createNotificationDeduplicationKey('task_started', 'task-2');
    const key3 = createNotificationDeduplicationKey('system_warning', 'sys-1');

    const notifs: NotificationDescriptor[] = [
      { type: 'error', severity: 'error', title: 'A1', message: 'A1', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 },
      { type: 'informational', severity: 'info', title: 'B1', message: 'B1', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key2 },
      { type: 'error', severity: 'error', title: 'A2', message: 'A2', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 },
      { type: 'warning', severity: 'warning', title: 'C1', message: 'C1', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key3 },
      { type: 'informational', severity: 'info', title: 'B2', message: 'B2', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key2 }
    ];

    const original = [...notifs];

    // Original order: A1, B1, A2, C1, B2
    // Newest-occurrence order should be: A2, C1, B2
    const deduped = deduplicateNotifications(notifs);
    expect(deduped).toHaveLength(3);

    expect(deduped[0].title).toBe('A2');
    expect(deduped[1].title).toBe('C1');
    expect(deduped[2].title).toBe('B2');

    // Ensure inputs are not mutated
    expect(notifs).toEqual(original);
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

    const context = {}; // No previous descriptor
    const original = { ...notification };
    const presentation = resolveNotificationPresentation(notification, defaultPrefs, context, soundManifest, true);

    expect(presentation.requiresExplicitDismissal).toBe(true); // Due to recovery required or persistence logic
    expect(presentation.announcementPriority).toBe('assertive');
    expect(notification).toEqual(original); // Ensure input not mutated
  });

  describe('Announcement resolution and material equivalence', () => {
    it('should politely announce ordinary informational duplicates if materially changed', () => {
       const previous: NotificationDescriptor = {
        type: 'informational', severity: 'info', title: 'Info', message: 'Something happened',
        dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: 'info-1'
      };
      const notification = { ...previous, message: 'Something else happened' }; // Material change

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('polite');
    });

    it('should suppress announcement for unchanged duplicates', () => {
      const notification: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1'
      };

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: notification }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(false);
      expect(presentation.announcementPriority).toBe('off');
    });

    it('should politely announce material changes for the same incident (unless escalated)', () => {
      const previous: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1'
      };
      const notification = { ...previous, message: 'Agent really stuck' }; // Material change

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('polite'); // Because severity is warning, not error/critical
    });

    it('should assertively announce material changes if severity is error or critical', () => {
       const previous: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1'
      };
      const notification = { ...previous, message: 'Agent fatally stuck', severity: 'error' as const }; // Material change & escalated

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('assertive');
    });

    it('should assertively announce entirely new incidents even if text is similar (no previous descriptor)', () => {
      const notification: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1'
      };

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, {}, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('assertive');
    });

    it('should assertively announce entirely new incidents (different deduplication key)', () => {
       const previous: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1'
      };
      const notification = { ...previous, deduplicationKey: 'recovery-2' }; // New incident

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('assertive');
    });

    it('should assertively announce entirely new incidents (different workflow or incident ID)', () => {
       const previous: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1',
        workflowOrIncidentId: 'inc-1'
      };
      const notification = { ...previous, workflowOrIncidentId: 'inc-2' }; // New incident

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('assertive');
    });

    it('should evaluate as new incident if task ID changes', () => {
       const previous: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1',
        taskId: 'task-1'
      };
      const notification = { ...previous, taskId: 'task-2' }; // New incident because task identity differs

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('assertive'); // New recovery incident is assertive
    });

    it('should evaluate as new incident if agent ID changes', () => {
       const previous: NotificationDescriptor = {
        type: 'recovery_required', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'assertive', deduplicationKey: 'recovery-1',
        agentId: 'agent-1'
      };
      const notification = { ...previous, agentId: 'agent-2' }; // New incident because agent identity differs

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('assertive'); // New recovery incident is assertive
    });

    it('should evaluate as new incident if type changes', () => {
       const previous: NotificationDescriptor = {
        type: 'warning', severity: 'warning', title: 'Recovery', message: 'Agent stuck',
        dismissible: true, persistenceExpectation: 'persistent_until_resolved', screenReaderAnnouncementPriority: 'polite', deduplicationKey: 'recovery-1',
      };
      // Escalating severity to 'error' directly triggers the 'assertive' fallback on new incidents.
      const notification = { ...previous, type: 'error' as const, severity: 'error' as const }; // New incident because type differs

      const presentation = resolveNotificationPresentation(
        notification, defaultPrefs, { previousDescriptor: previous }, soundManifest, true
      );

      expect(presentation.shouldAnnounce).toBe(true);
      expect(presentation.announcementPriority).toBe('assertive'); // Error incident is assertive
    });
  });

  describe('Deduplication edge cases', () => {
    it('should handle empty lists correctly', () => {
      expect(deduplicateNotifications([])).toHaveLength(0);
    });

    it('should handle single items correctly', () => {
      const key1 = createNotificationDeduplicationKey('task_failed', 'task-1');
      const notif: NotificationDescriptor = { type: 'error', severity: 'error', title: 'A1', message: 'A1', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 };

      const deduped = deduplicateNotifications([notif]);
      expect(deduped).toHaveLength(1);
      expect(deduped[0]).toEqual(notif);
    });

    it('should handle multiple duplicate groups correctly', () => {
      const key1 = createNotificationDeduplicationKey('error', '1');
      const key2 = createNotificationDeduplicationKey('info', '2');

      const notifs: NotificationDescriptor[] = [
        { type: 'error', severity: 'error', title: 'A1', message: 'A1', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 },
        { type: 'informational', severity: 'info', title: 'B1', message: 'B1', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key2 },
        { type: 'error', severity: 'error', title: 'A2', message: 'A2', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 },
        { type: 'informational', severity: 'info', title: 'B2', message: 'B2', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key2 },
        { type: 'error', severity: 'error', title: 'A3', message: 'A3', dismissible: true, persistenceExpectation: 'ephemeral', screenReaderAnnouncementPriority: 'polite', deduplicationKey: key1 }
      ];

      const deduped = deduplicateNotifications(notifs);
      expect(deduped).toHaveLength(2);
      expect(deduped[0].title).toBe('B2');
      expect(deduped[1].title).toBe('A3');
    });
  });
});
