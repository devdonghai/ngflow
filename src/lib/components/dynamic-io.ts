import type { Type } from '@angular/core';

interface ComponentDefLike {
  inputs?: Record<string, string | [string, ...unknown[]]>;
}

/**
 * Returns the set of public input names declared by an Angular component. Used
 * to filter the full `NodeProps`/`EdgeProps` bag down to the inputs a given
 * (built-in or custom) component actually declares, so `NgComponentOutlet` never
 * calls `setInput` with an unknown name (which logs an NG0303 console error).
 *
 * Mirrors the Svelte/React behaviour where a node/edge component silently
 * ignores props it does not destructure.
 */
export function declaredInputNames(type: Type<unknown>): Set<string> {
  const def = (type as unknown as { ɵcmp?: ComponentDefLike }).ɵcmp;
  const names = new Set<string>();
  const inputs = def?.inputs;
  if (inputs) {
    for (const value of Object.values(inputs)) {
      names.add(Array.isArray(value) ? value[0] : value);
    }
  }
  return names;
}

/**
 * Filters `props` to only the keys declared as inputs on `type`.
 *
 * Keys whose value is `undefined` are skipped so the component's own input
 * default is preserved: `NgComponentOutlet` calls `setInput` for every key in
 * the record, and `setInput(name, undefined)` would clobber a built-in node's
 * default (e.g. `sourcePosition = Position.Bottom`) — leaving handles with a
 * `ng-flow__handle-undefined` class that no stylesheet positions. This mirrors
 * the React/Svelte semantics where an omitted prop falls back to its default.
 */
export function pickDeclaredInputs(
  type: Type<unknown>,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const declared = declaredInputNames(type);
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (declared.has(key) && props[key] !== undefined) {
      result[key] = props[key];
    }
  }
  return result;
}
