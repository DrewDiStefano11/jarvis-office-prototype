# Jarvis Office UI Design System Foundation

## Overview
This design system foundation provides reusable, accessible, and framework-neutral UI primitives for the Jarvis visual office. The components and tokens are isolated from active task-simulation mechanics to prevent merge conflicts with other teams.

## Tokens & Styling
All design tokens are defined as CSS custom properties in `src/design-system/tokens.css`.
- **Colors:** Defined semantically (e.g., `--color-surface-primary`, `--status-error-background`).
- **Typography, Spacing, Shadows, Radii:** Follow a standardized scale (e.g., `--spacing-4`, `--radius-md`).
- **Focus Indicators:** Centralized variables (e.g., `--focus-ring-color`) ensure consistent keyboard navigation visibility across all interactive components.

Components map closely to these tokens using CSS Modules to keep styles scoped.

## Status Semantics
A centralized list of stable statuses maps directly to visual output (via `StatusBadge` or raw tokens). The mapped statuses are:
- `idle`
- `working`
- `paused`
- `queued`
- `completed`
- `error`
- `blocked`
- `cancelled`
- `recovery-required`
- `offline`

Each status ensures consistent backgrounds, text colors, and borders using corresponding CSS custom properties (e.g., `--status-working-background`).

## Components
The system provides:
- **Button / IconButton:** Handles semantic states, disabled constraints, and proper focus rings.
- **Badge / StatusBadge:** Provides visual indicators mapping to our semantic statuses, alongside hidden text for screen readers.
- **Card / Panel:** Container primitives for grouping content.
- **ProgressBar:** Clamped internally and provides required ARIA properties.
- **Tooltip, Modal, Tabs:** Accessible interactive primitives.
- **EmptyState, InlineAlert, LoadingState:** Consistent structural components for messaging.
- **FormFieldWrapper:** Groups a label, optional description, error message, and correctly wires up internal `aria-describedby` logic for forms.
- **VisuallyHidden:** A helper to provide screen-reader text without visually displaying it on-screen.
- **Icon:** A standalone placeholder SVG system mapping semantic IDs (`play`, `pause`, etc.).

## Accessibility Expectations
- Interactive elements are focusable via keyboard (`Tab`, `Shift+Tab`).
- Actionable elements trigger via keyboard (`Enter` and `Space` for buttons).
- Screen readers receive necessary context via `aria-label`, `aria-describedby`, and `<VisuallyHidden>` text.
- Focus states (`outline`, `outline-offset`) are distinct and visible.
- Tests actively enforce accessible role presence and proper visual hiding techniques.

## Responsive Rules
Default component styles are unopinionated concerning width and stack natively. Where needed, media queries can use predefined `--breakpoint-*` CSS custom properties (pending build-tool support) or raw widths matching token definitions. Components expect to be placed within flexible layouts (e.g. flexbox/grid containers).

## Future Integration
**How task panels should adopt the primitives:**
Task panels (like `ControlPanel.tsx` and future modals) should progressively adopt these primitives by importing them from `src/design-system/components`.
Example:
```tsx
import { Button, StatusBadge } from '../design-system/components';
// ...
<StatusBadge status="working" />
<Button onClick={handleClick}>Assign</Button>
```

**Adopting Tokens in Global App:**
Tokens in `src/design-system/tokens.css` should be imported once at the root level of the main application (e.g., in `main.tsx` or `App.tsx`) when the team is ready to fully transition to the design system.

## Deferred Work & Exclusions
To keep the scope of this additive PR focused, the following work has been deliberately deferred:
- Integration into the active application layout (`App.tsx`, `ControlPanel.tsx`, Phaser scene).
- Third-party Icon libraries (simple SVGs have been provided).
- Global dark mode toggle (tokens default to a light semantic theme).
- Any backend, websocket, or persistence hooks.
- Task-domain dependencies have been scrubbed from components.

### Tooltips & Disabled Controls
Native HTML elements that are `disabled` (like `<button disabled>`) do not fire pointer or focus events. Because tooltips rely on these events to show and hide, attaching a `<Tooltip>` directly to a disabled element will result in the tooltip never appearing.
When providing a tooltip for a disabled control, you **must** wrap the disabled control in an interactive container (like a focusable `<span>` or `<div>`) and apply the tooltip to that wrapper instead.
