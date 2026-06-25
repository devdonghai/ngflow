import { computed, type Signal } from '@angular/core';

import type { Edge, InternalNode, Node } from '../types';
import { injectStore } from './inject-store';
import { read, type MaybeSignal } from './util';

/**
 * Hook to get an internal node by id. Angular port of Svelte Flow's
 * `useInternalNode`. The id may be a plain string or a {@link Signal} for a
 * reactive lookup. Returns a reactive {@link Signal} of the internal node (or
 * `undefined` when no node matches).
 *
 * @public
 * @param id - the node id (plain or reactive)
 */
export function injectInternalNode<NodeType extends Node = Node>(
  id: MaybeSignal<string>,
): Signal<InternalNode<NodeType> | undefined> {
  const store = injectStore<NodeType, Edge>();
  return computed(() => {
    // Subscribe to node changes so adoptUserNodes keeps the lookup current.
    store.nodes;
    return store.nodeLookup.get(read(id));
  });
}
