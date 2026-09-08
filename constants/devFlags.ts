// Testing affordances for time-gated UI.
//
// Every flag is `__DEV__ && false` by default: the __DEV__ guard means a
// production build ignores them even if one is accidentally left true,
// and the explicit `false` means nothing changes until someone flips it
// deliberately for a test session. Same pattern as
// MEMORY_LANE_DEV_UNLOCK in featureUnlockService.
//
// Flip → save → Metro fast-refreshes → the gated UI appears on both
// phones. Flip back before finishing the session.

// Weekly ritual cards are pinned to specific weekdays so they don't all
// stack on Sunday: Wednesday = "write one Would You Rather", Thursday =
// Memory Lane (or the Sunday Check-in history card when Memory Lane is
// not ready). With this on, both render on any day, so a single test
// session can cover all of them.
export const DEV_IGNORE_WEEKDAY_GATES = __DEV__ && false;
