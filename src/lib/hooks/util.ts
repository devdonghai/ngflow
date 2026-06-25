import { isSignal, type Signal } from '@angular/core';

/** A value that may be passed either directly or as a reactive {@link Signal}. */
export type MaybeSignal<T> = T | Signal<T>;

/** Reads a {@link MaybeSignal}, unwrapping it if it is a signal. */
export function read<T>(value: MaybeSignal<T>): T {
  return isSignal(value) ? value() : value;
}
