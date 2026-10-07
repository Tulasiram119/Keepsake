import type { PersistedState } from './types';

/**
 * Upgrades persisted state written by an older STORE_VERSION.
 * v1 is the first schema, so there is nothing to migrate yet. Add a
 * `if (fromVersion < N)` block per future version, in ascending order.
 */
export function migratePersisted(state: unknown, fromVersion: number): PersistedState {
  void fromVersion;
  return state as PersistedState;
}
