import { computed, type Signal } from '@angular/core';

import type { Viewport } from '../system';
import type { Edge, Node } from '../types';
import { injectStore } from './inject-store';

/**
 * A reactive accessor over a piece of writable store state. `current` is a read
 * {@link Signal}; `set`/`update` write back to the store. Angular equivalent of
 * the Svelte `{ current, set, update }` reactive objects.
 *
 * @public
 */
export interface StoreAccessor<T> {
  /** Reactive read of the current value. */
  readonly current: Signal<T>;
  /** Replace the value. */
  set(value: T): void;
  /** Update the value from its previous value. */
  update(updateFn: (value: T) => T): void;
}

/**
 * Hook for reading/writing the current nodes. Angular port of Svelte Flow's
 * `useNodes`.
 *
 * @public
 */
export function injectNodes<NodeType extends Node = Node>(): StoreAccessor<NodeType[]> {
  const store = injectStore<NodeType>();
  return {
    current: computed(() => store.nodes),
    set: (nodes) => (store.nodes = nodes),
    update: (updateFn) => (store.nodes = updateFn(store.nodes)),
  };
}

/**
 * Hook for reading/writing the current edges. Angular port of Svelte Flow's
 * `useEdges`.
 *
 * @public
 */
export function injectEdges<EdgeType extends Edge = Edge>(): StoreAccessor<EdgeType[]> {
  const store = injectStore<Node, EdgeType>();
  return {
    current: computed(() => store.edges),
    set: (edges) => (store.edges = edges),
    update: (updateFn) => (store.edges = updateFn(store.edges)),
  };
}

/**
 * Hook for reading/writing the current viewport. Angular port of Svelte Flow's
 * `useViewport`.
 *
 * @public
 */
export function injectViewport(): StoreAccessor<Viewport> {
  const store = injectStore();
  return {
    current: computed(() => store.viewport),
    set: (viewport) => (store.viewport = viewport),
    update: (updateFn) => (store.viewport = updateFn(store.viewport)),
  };
}
