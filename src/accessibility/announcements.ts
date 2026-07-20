import type { AnnouncementDescriptor } from "./types";

export const ANNOUNCEMENTS: readonly AnnouncementDescriptor[] = [
  {
    id: "AGENT_SELECTED",
    politeness: "polite",
    deduplicationKey: "agent:{agentId}:selection",
    messageTemplate: "Agent {agentName} selected.",
    requiredParameters: ["agentId", "agentName"],
  },
  {
    id: "TASK_STARTED",
    politeness: "polite",
    deduplicationKey: "task:{taskId}:status",
    messageTemplate: "Task {taskName} started for {agentName}.",
    requiredParameters: ["taskId", "taskName", "agentName"],
  },
  {
    id: "TASK_PROGRESS_CHANGED",
    politeness: "polite",
    deduplicationKey: "task:{taskId}:progress",
    messageTemplate: "Task {taskName} is {progressPercent} percent complete.",
    requiredParameters: ["taskId", "taskName", "progressPercent"],
  },
  {
    id: "TASK_PAUSED",
    politeness: "polite",
    deduplicationKey: "task:{taskId}:status",
    messageTemplate: "Task {taskName} paused.",
    requiredParameters: ["taskId", "taskName"],
  },
  {
    id: "TASK_COMPLETED",
    politeness: "polite",
    deduplicationKey: "task:{taskId}:status",
    messageTemplate: "Task {taskName} completed successfully.",
    requiredParameters: ["taskId", "taskName"],
  },
  {
    id: "TASK_FAILED",
    politeness: "assertive",
    deduplicationKey: "task:{taskId}:status",
    messageTemplate: "Task {taskName} failed. Reason: {reason}.",
    requiredParameters: ["taskId", "taskName", "reason"],
  },
  {
    id: "TASK_BLOCKED",
    politeness: "assertive",
    deduplicationKey: "task:{taskId}:status",
    messageTemplate: "Task {taskName} blocked. Waiting for {blockReason}.",
    requiredParameters: ["taskId", "taskName", "blockReason"],
  },
  {
    id: "APPROVAL_REQUIRED",
    politeness: "assertive",
    deduplicationKey: "approval:{approvalId}:required",
    messageTemplate: "Approval required for {actionName}.",
    requiredParameters: ["approvalId", "actionName"],
  },
  {
    id: "EMERGENCY_STOP_ACTIVATED",
    politeness: "assertive",
    deduplicationKey: "incident:{incidentId}:emergency-stop",
    messageTemplate: "Emergency stop activated. All tasks halted.",
    requiredParameters: ["incidentId"],
  },
  {
    id: "RECOVERY_REQUIRED",
    politeness: "assertive",
    deduplicationKey: "workflow:{workflowId}:recovery",
    messageTemplate: "System recovery required. {recoverySteps}",
    requiredParameters: ["workflowId", "recoverySteps"],
  },
  {
    id: "NO_TASK_AVAILABLE",
    politeness: "polite",
    deduplicationKey: "agent:{agentId}:task_availability",
    messageTemplate: "No task available for {agentName}.",
    requiredParameters: ["agentId", "agentName"],
  }
];
