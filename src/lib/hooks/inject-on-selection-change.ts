import { DestroyRef, inject } from '@angular/core';

import type { Edge, Node, OnSelectionChange } from '../types';
import { injectStore } from './inject-store';

/**
 * Registers a callback that fires whenever the set of selected nodes/edges
 * changes. Angular port of Svelte Flow's `useOnSelectionChange`. The handler is
 * automatically removed when the injecting context is destroyed, so call this
 * in an injection context.
 *
 * @public
 */
export function injectOnSelectionChange<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>(onSelectionChange: OnSelectionChange<NodeType, EdgeType>): void {
  const store = injectStore<NodeType, EdgeType>();
  const symbol = Symbol();

  store.selectionChangeHandlers.set(symbol, onSelectionChange);

  inject(DestroyRef).onDestroy(() => {
    store.selectionChangeHandlers.delete(symbol);
  });
}
