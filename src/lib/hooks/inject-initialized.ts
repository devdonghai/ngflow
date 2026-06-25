import { computed, type Signal } from '@angular/core';

import { injectStore } from './inject-store';

/**
 * Hook to track whether nodes have been measured/initialized. Angular port of
 * Svelte Flow's `useNodesInitialized`. Returns a reactive {@link Signal}.
 *
 * @public
 */
export function injectNodesInitialized(): Signal<boolean> {
  const store = injectStore();
  return computed(() => store.nodesInitialized);
}

/**
 * Hook to track whether the viewport (pan/zoom) has been initialized. Angular
 * port of Svelte Flow's `useViewportInitialized`. Returns a reactive
 * {@link Signal}.
 *
 * @public
 */
export function injectViewportInitialized(): Signal<boolean> {
  const store = injectStore();
  return computed(() => store.viewportInitialized);
}
