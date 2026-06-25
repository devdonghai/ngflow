import { errorMessages } from '../system';
import { injectFlowStore } from '../store/context';
import type { Edge, Node } from '../types';
import type { FlowStore } from '../store/types';

const providerErrorMessage = errorMessages['error001']('angular');

/**
 * Injects the shared {@link FlowStore}. Angular port of Svelte Flow's
 * `useStore`. Throws the standard "used outside provider" error when called
 * outside an NgFlow subtree.
 *
 * @public
 */
export function injectStore<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>(): FlowStore<NodeType, EdgeType> {
  return injectFlowStore<NodeType, EdgeType>(providerErrorMessage);
}
