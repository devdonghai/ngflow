import { signal, type Signal } from '@angular/core';

/**
 * A signal that tracks a CSS media query, replacing `svelte/reactivity`'s
 * `MediaQuery`. Safe to construct during SSR (no `window`): it falls back to
 * `fallback` and never attaches a listener.
 */
export function mediaQuerySignal(query: string, fallback = false): Signal<boolean> {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return signal(fallback).asReadonly();
  }

  const mql = window.matchMedia(query);
  const current = signal(mql.matches);
  mql.addEventListener('change', (event) => current.set(event.matches));

  return current.asReadonly();
}
