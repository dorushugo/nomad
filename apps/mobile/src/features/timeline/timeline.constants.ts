// Vertical layout: each hour row is HOUR_HEIGHT tall, grid spans
// START_HOUR..END_HOUR inclusive. Items below START_HOUR or above
// END_HOUR are surfaced in the "non planifié" pane instead.
export const HOUR_HEIGHT = 72;
export const START_HOUR = 6;
export const END_HOUR = 23;
export const HOURS: number[] = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i
);

// Horizontal: hour labels live in the left gutter; items render to the right.
export const TIMELINE_LEFT = 80;

// Drag/create snap step. 15-minute granularity matches users' mental model.
export const SNAP_MINUTES = 15;

// Negative offset between finger and drag pill so the pill renders above the
// thumb (touch ergonomics).
export const TOUCH_Y_OFFSET = -15;

// Day strip ergonomics — 6 days fit comfortably; beyond that, scroll.
export const MAX_VISIBLE_DAYS = 6;
