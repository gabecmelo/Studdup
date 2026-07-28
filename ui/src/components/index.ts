// Shared component library barrel (T19). Presentational components plus the two pure helpers
// (column placement + link validity) reused by the board and modals in later tasks.

export { Card } from "./Card";
export type { CardProps } from "./Card";

export {
  StageBadge,
  SpacedStageBadge,
  ExamStageBadge,
} from "./StageBadge";
export type { StageBadgeProps } from "./StageBadge";

export { MethodSwitcher } from "./MethodSwitcher";
export type { MethodSwitcherProps } from "./MethodSwitcher";

export {
  TechniqueChip,
  TECHNIQUE_LABEL,
  TECHNIQUE_SUMMARY,
} from "./TechniqueChip";
export type { TechniqueChipProps } from "./TechniqueChip";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { ModalShell } from "./ModalShell";
export type { ModalShellProps } from "./ModalShell";

export { Countdown, formatClock } from "./Countdown";
export type { CountdownProps } from "./Countdown";

export { LinkRow } from "./LinkRow";
export type { LinkRowProps } from "./LinkRow";

export { Toast } from "./Toast";
export type { ToastProps, ToastVariant } from "./Toast";

export {
  columnForCard,
  columnForDueDate,
  daysBetween,
  COLUMN_LABELS,
  COLUMN_ORDER,
} from "./columns";
export type { Column } from "./columns";

export { isOpenableLink } from "./links";
