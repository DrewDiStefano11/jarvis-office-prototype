import { describe, it, expect } from "vitest";
import { validateKeyboardCommands, validateFocusTargets, validateAnnouncements, requireValidAccessibilityConfiguration } from "../validation";
import type { KeyboardCommand, FocusTarget, AnnouncementDescriptor } from "../types";

describe("Accessibility Validation", () => {
  it("validates valid keyboard commands without issues", () => {
    const commands: KeyboardCommand[] = [
      { id: "CMD_1", label: "Command 1", essential: true },
      { id: "CMD_2", label: "Command 2", defaultShortcut: "Enter", essential: true },
    ];
    const res = validateKeyboardCommands(commands);
    expect(res.isValid).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it("detects duplicate keyboard command IDs and missing labels", () => {
    const commands: KeyboardCommand[] = [
      { id: "CMD_1", label: "Command 1", essential: true },
      { id: "CMD_1", label: "", essential: true },
    ];
    const res = validateKeyboardCommands(commands);
    expect(res.isValid).toBe(false);

    const missingLabelIssue = res.issues.find(i => i.code === "MISSING_READABLE_LABEL");
    const duplicateIdIssue = res.issues.find(i => i.code === "DUPLICATE_COMMAND_ID");

    expect(missingLabelIssue).toBeDefined();
    expect(duplicateIdIssue).toBeDefined();
  });

  it("detects shortcut conflicts and normalizes", () => {
    const commands: KeyboardCommand[] = [
      { id: "CMD_1", label: "Command 1", defaultShortcut: "Ctrl+Shift+P", essential: true },
      { id: "CMD_2", label: "Command 2", defaultShortcut: "shift + ctrl + p", essential: true },
    ];
    const res = validateKeyboardCommands(commands);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "SHORTCUT_CONFLICT")).toBe(true);
  });

  it("detects invalid shortcuts", () => {
    const commands: KeyboardCommand[] = [
      { id: "CMD_1", label: "Command 1", defaultShortcut: "Ctrl+Ctrl+P", essential: true },
    ];
    const res = validateKeyboardCommands(commands);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "INVALID_SHORTCUT")).toBe(true);
  });

  it("validates valid focus targets", () => {
    const targets: FocusTarget[] = [{ id: "t1" }, { id: "t2" }];
    const res = validateFocusTargets(targets, "t1");
    expect(res.isValid).toBe(true);
  });

  it("detects duplicate focus target IDs", () => {
    const targets: FocusTarget[] = [{ id: "t1" }, { id: "t1" }];
    const res = validateFocusTargets(targets);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "DUPLICATE_FOCUS_TARGET_ID")).toBe(true);
  });

  it("detects disabled active target", () => {
    const targets: FocusTarget[] = [{ id: "t1", disabled: true }];
    const res = validateFocusTargets(targets, "t1");
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "DISABLED_ACTIVE_TARGET")).toBe(true);
  });

  it("detects unknown active target", () => {
    const targets: FocusTarget[] = [{ id: "t1" }];
    const res = validateFocusTargets(targets, "t2");
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "UNKNOWN_FOCUS_TARGET")).toBe(true);
  });

  it("validates valid announcements", () => {
    const announcements: AnnouncementDescriptor[] = [
      { id: "A1", politeness: "polite", deduplicationKey: "dk", messageTemplate: "T", requiredParameters: [] }
    ];
    const res = validateAnnouncements(announcements);
    expect(res.isValid).toBe(true);
  });

  it("detects invalid politeness and missing template", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const announcements: any[] = [
      { id: "A1", politeness: "invalid", deduplicationKey: "dk", messageTemplate: "", requiredParameters: [] }
    ];
    const res = validateAnnouncements(announcements);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "INVALID_ANNOUNCEMENT_PRIORITY")).toBe(true);
    expect(res.issues.some(i => i.code === "MISSING_ACCESSIBLE_DESCRIPTION")).toBe(true);
  });

  it("detects missing/duplicate announcement IDs and dedup keys", () => {
    const announcements: AnnouncementDescriptor[] = [
      { id: "", politeness: "polite", deduplicationKey: "dk", messageTemplate: "T", requiredParameters: [] },
      { id: "A2", politeness: "polite", deduplicationKey: "", messageTemplate: "T", requiredParameters: [] },
      { id: "A2", politeness: "polite", deduplicationKey: "dk2", messageTemplate: "T2", requiredParameters: [] }
    ];
    const res = validateAnnouncements(announcements);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "MISSING_ANNOUNCEMENT_ID")).toBe(true);
    expect(res.issues.some(i => i.code === "MISSING_DEDUPLICATION_KEY")).toBe(true);
    expect(res.issues.some(i => i.code === "DUPLICATE_ANNOUNCEMENT_ID")).toBe(true);
  });

  it("detects template parameter issues", () => {
    const announcements: AnnouncementDescriptor[] = [
      { id: "A1", politeness: "polite", deduplicationKey: "dk", messageTemplate: "Hello {name} {missing}", requiredParameters: ["name", "extra", "name"] }
    ];
    const res = validateAnnouncements(announcements);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.code === "DUPLICATE_REQUIRED_PARAMETER")).toBe(true);
    expect(res.issues.some(i => i.code === "UNKNOWN_TEMPLATE_PARAMETER")).toBe(true);
    expect(res.issues.some(i => i.code === "MISSING_TEMPLATE_PARAMETER")).toBe(true); // 'extra' is missing in template
  });

  it("requireValidAccessibilityConfiguration throws on error", () => {
    const targets: FocusTarget[] = [{ id: "t1" }, { id: "t1" }];
    const res = validateFocusTargets(targets);
    expect(() => requireValidAccessibilityConfiguration(res)).toThrowError(/Accessibility validation failed:/);
  });
});
