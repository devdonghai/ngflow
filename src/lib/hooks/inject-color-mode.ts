import { computed, type Signal } from '@angular/core';

import type { ColorModeClass } from '../system';
import { injectStore } from './inject-store';

/**
 * Hook for receiving the current color-mode class (`'dark'` or `'light'`).
 * Angular port of Svelte Flow's `useColorMode`. Returns a reactive
 * {@link Signal}.
 *
 * @public
 */
export function injectColorMode(): Signal<ColorModeClass> {
  const store = injectStore();
  return computed(() => store.colorMode);
}
