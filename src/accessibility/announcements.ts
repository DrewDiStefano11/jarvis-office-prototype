import type { AnnouncementDescriptor } from "./types";

export const ANNOUNCEMENTS: readonly AnnouncementDescriptor[] = [
  {
    id: "AGENT_SELECTED",
    politeness: "polite",
    deduplicationKey: "agent_selection",
    messageTemplate: "Agent {agentName} selected.",
    requiredParameters: ["agentName"],
  },
  {
    id: "TASK_STARTED",
    politeness: "polite",
    deduplicationKey: "task_status_change",
    messageTemplate: "Task {taskName} started for {agentName}.",
    requiredParameters: ["taskName", "agentName"],
  },
  {
    id: "TASK_PROGRESS_CHANGED",
    politeness: "polite",
    deduplicationKey: "task_progress_change",
    messageTemplate: "Task {taskName} is {progressPercent} percent complete.",
    requiredParameters: ["taskName", "progressPercent"],
  },
  {
    id: "TASK_PAUSED",
    politeness: "polite",
    deduplicationKey: "task_status_change",
    messageTemplate: "Task {taskName} paused.",
    requiredParameters: ["taskName"],
  },
  {
    id: "TASK_COMPLETED",
    politeness: "polite",
    deduplicationKey: "task_status_change",
    messageTemplate: "Task {taskName} completed successfully.",
    requiredParameters: ["taskName"],
  },
  {
    id: "TASK_FAILED",
    politeness: "assertive",
    deduplicationKey: "task_status_change",
    messageTemplate: "Task {taskName} failed. Reason: {reason}.",
    requiredParameters: ["taskName", "reason"],
  },
  {
    id: "TASK_BLOCKED",
    politeness: "assertive",
    deduplicationKey: "task_status_change",
    messageTemplate: "Task {taskName} blocked. Waiting for {blockReason}.",
    requiredParameters: ["taskName", "blockReason"],
  },
  {
    id: "APPROVAL_REQUIRED",
    politeness: "assertive",
    deduplicationKey: "user_action_required",
    messageTemplate: "Approval required for {actionName}.",
    requiredParameters: ["actionName"],
  },
  {
    id: "EMERGENCY_STOP_ACTIVATED",
    politeness: "assertive",
    deduplicationKey: "emergency_status",
    messageTemplate: "Emergency stop activated. All tasks halted.",
    requiredParameters: [],
  },
  {
    id: "RECOVERY_REQUIRED",
    politeness: "assertive",
    deduplicationKey: "emergency_status",
    messageTemplate: "System recovery required. {recoverySteps}",
    requiredParameters: ["recoverySteps"],
  },
  {
    id: "NO_TASK_AVAILABLE",
    politeness: "polite",
    deduplicationKey: "task_availability",
    messageTemplate: "No task available for {agentName}.",
    requiredParameters: ["agentName"],
  }
];
