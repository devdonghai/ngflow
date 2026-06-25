import type {
  FitViewOptionsBase,
  XYPosition,
  Handle,
  Connection,
  OnBeforeDeleteBase,
} from '../system';

import type { Node } from './nodes';
import type { Edge } from './edges';

/**
 * Modifier keys that can be required alongside a key for a keyboard shortcut.
 * Ported from `@svelte-put/shortcut`'s `ShortcutModifierDefinition` to stay
 * dependency-free; a definition is a single modifier, a set of modifiers that
 * must all be pressed, or a list of alternative modifier sets.
 */
export type KeyModifierName = 'alt' | 'ctrl' | 'meta' | 'shift';
export type KeyModifier = KeyModifierName | KeyModifierName[] | KeyModifierName[][];

export type KeyDefinitionObject = { key: string; modifier?: KeyModifier };
export type KeyDefinition = string | KeyDefinitionObject;

export type ConnectionData = {
  connectionPosition: XYPosition | null;
  connectionStartHandle: Handle | null;
  connectionEndHandle: Handle | null;
  connectionStatus: string | null;
};

/**
 * @inline
 */
export type FitViewOptions<NodeType extends Node = Node> = FitViewOptionsBase<NodeType>;

/**
 * This type can be used to type the `onDelete` function with a custom node and edge type.
 *
 * @public
 */
export type OnDelete<NodeType extends Node = Node, EdgeType extends Edge = Edge> = (params: {
  nodes: NodeType[];
  edges: EdgeType[];
}) => void;

export type OnBeforeConnect<EdgeType extends Edge = Edge> = (
  connection: Connection,
) => EdgeType | Connection | void | false | null;
export type OnBeforeReconnect<EdgeType extends Edge = Edge> = (
  newEdge: EdgeType,
  oldEdge: EdgeType,
) => EdgeType | void | false | null;
export type OnBeforeDelete<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
> = OnBeforeDeleteBase<NodeType, EdgeType>;

/**
 *  This type can be used to type the `isValidConnection` function.
 *  If the function returns `true`, the connection is valid and can be created.
 */
export type IsValidConnection<EdgeType extends Edge = Edge> = (
  edge: EdgeType | Connection,
) => boolean;

export type OnSelectionChange<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
> = (params: { nodes: NodeType[]; edges: EdgeType[] }) => void;
