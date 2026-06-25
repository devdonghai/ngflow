import { computed, type Signal } from '@angular/core';

import type { ConnectionState } from '../system';
import { injectStore } from './inject-store';

/**
 * Hook for receiving the current in-progress connection. Angular port of Svelte
 * Flow's `useConnection`. Returns a reactive {@link Signal}; read it in a
 * template or `computed`/`effect` to subscribe to connection changes.
 *
 * @public
 */
export function injectConnection(): Signal<ConnectionState> {
  const store = injectStore();
  return computed(() => store.connection);
}
