import type { Type } from '@angular/core';
import type { InternalNodeBase, NodeBase, NodeProps as NodePropsBase } from '../system';

/**
 * A loose alias for the value accepted by an Angular `class` binding.
 * Mirrors Svelte's `ClassValue` but stays framework-neutral.
 */
export type ClassValue = string | undefined | null | Record<string, boolean> | ClassValue[];

/**
 * The node data structure that gets used for internal nodes.
 * There are some data structures added under node.internal
 * that are needed for tracking some properties
 * @public
 */
export type InternalNode<NodeType extends Node = Node> = InternalNodeBase<NodeType>;

/**
 * The node data structure that gets used for the nodes prop.
 * @public
 */
export type Node<
  NodeData extends Record<string, unknown> = Record<string, unknown>,
  NodeType extends string | undefined = string | undefined,
> = NodeBase<NodeData, NodeType> & {
  class?: ClassValue;
  style?: string;
  focusable?: boolean;
  /**
   * The ARIA role attribute for the node element, used for accessibility.
   * @default "group"
   */
  ariaRole?: string;

  /**
   * General escape hatch for adding custom attributes to the node's DOM element.
   */
  domAttributes?: Record<string, unknown>;
};

export type NodeProps<NodeType extends Node = Node> = NodePropsBase<NodeType> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any;
};

/**
 * The Angular component contract for a custom node. Custom node components are
 * standalone components that declare whichever {@link NodeProps} inputs they
 * consume (the renderer only sets the inputs a component actually declares, so
 * a node may omit the props it does not use — mirroring Svelte/React).
 */
export type NodeComponent = Type<unknown>;

export type NodeTypes = Record<string, NodeComponent>;

export type BuiltInNode =
  | Node<{ label: string }, 'input' | 'output' | 'default' | undefined>
  | Node<Record<string, never>, 'group'>;
