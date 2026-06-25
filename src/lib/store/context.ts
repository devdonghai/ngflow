import { InjectionToken, inject } from '@angular/core';

import type { Edge, Node } from '../types';
import type { FlowStore } from './types';

/**
 * DI replacement for Svelte Flow's context layer.
 *
 * Svelte uses `setContext(key, value)` on a parent and `getContext(key)` on a
 * descendant. In Angular the equivalent is providing a value for an
 * `InjectionToken` on a component/directive and `inject()`-ing it in a
 * descendant. The NgFlow root component provides {@link FLOW_STORE}; node and
 * edge wrappers provide the per-element id/connectable tokens.
 */

/** The shared reactive store, provided by the NgFlow root (or a provider). */
export const FLOW_STORE = new InjectionToken<FlowStore<Node, Edge>>('NgFlow Store');

/** The id of the node currently being rendered (provided by NodeWrapper). */
export const NODE_ID = new InjectionToken<string>('NgFlow Node Id');

/** Reactive connectable state for the current node (provided by NodeWrapper). */
export interface ConnectableContext {
  value: boolean;
}
export const NODE_CONNECTABLE = new InjectionToken<ConnectableContext>('NgFlow Node Connectable');

/** The id of the edge currently being rendered (provided by EdgeWrapper). */
export const EDGE_ID = new InjectionToken<string>('NgFlow Edge Id');

/**
 * Injects the shared store. Pass an error message to assert it is present
 * (mirrors Svelte Flow's `useStore` error when used outside a provider).
 */
export function injectFlowStore<NodeType extends Node = Node, EdgeType extends Edge = Edge>(
  errorMessage?: string,
): FlowStore<NodeType, EdgeType> {
  const store = inject(FLOW_STORE, { optional: true });
  if (!store && errorMessage) {
    throw new Error(errorMessage);
  }
  return store as unknown as FlowStore<NodeType, EdgeType>;
}

export function injectNodeId(): string | undefined {
  return inject(NODE_ID, { optional: true }) ?? undefined;
}

export function injectEdgeId(): string | undefined {
  return inject(EDGE_ID, { optional: true }) ?? undefined;
}

export function injectNodeConnectable(): ConnectableContext | undefined {
  return inject(NODE_CONNECTABLE, { optional: true }) ?? undefined;
}
