import type { Signal, WritableSignal } from '@angular/core';
import type {
  InternalNodeUpdate,
  XYPosition,
  ViewportHelperFunctionOptions,
  Connection,
  UpdateNodePositions,
  CoordinateExtent,
  UpdateConnection,
  Viewport,
  SetCenter,
} from '../system';

import type { Node, Edge, NodeTypes, EdgeTypes, FitViewOptions, InternalNode } from '../types';
import type { FlowProps } from './flow-props';
import type { NgFlowStore } from './flow-store';

/**
 * The reactive inputs the store reads from. The owning NgFlow component creates
 * these signals and hands them to {@link createStore}. `nodes`/`edges`/`viewport`
 * are writable so store actions can update them; `props`/`width`/`height` are
 * read-only projections of the component inputs.
 */
export interface StoreSignals<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  props: Signal<FlowProps<NodeType, EdgeType>>;
  width: Signal<number | undefined>;
  height: Signal<number | undefined>;
  nodes: WritableSignal<NodeType[]>;
  edges: WritableSignal<EdgeType[]>;
  /** Controlled viewport (undefined when the viewport is uncontrolled). */
  viewport: WritableSignal<Viewport | undefined>;
}

/**
 * The imperative actions exposed by the store. Ported 1:1 from Svelte Flow's
 * `SvelteFlowStoreActions`.
 */
export interface NgFlowStoreActions<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  setNodeTypes: (nodeTypes: NodeTypes) => void;
  setEdgeTypes: (edgeTypes: EdgeTypes) => void;
  addEdge: (edge: EdgeType | Connection) => void;
  zoomIn: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  zoomOut: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  setMinZoom: (minZoom: number) => void;
  setMaxZoom: (maxZoom: number) => void;
  setTranslateExtent: (extent: CoordinateExtent) => void;
  fitView: (options?: FitViewOptions<NodeType>) => Promise<boolean>;
  setCenter: SetCenter;
  updateNodePositions: UpdateNodePositions;
  updateNodeInternals: (updates: Map<string, InternalNodeUpdate>) => void;
  unselectNodesAndEdges: (params?: { nodes?: NodeType[]; edges?: EdgeType[] }) => void;
  addSelectedNodes: (ids: string[]) => void;
  addSelectedEdges: (ids: string[]) => void;
  handleNodeSelection: (id: string, unselect?: boolean, nodeRef?: HTMLElement | null) => void;
  handleEdgeSelection: (id: string) => void;
  moveSelectedNodes: (direction: XYPosition, factor: number) => void;
  panBy: (delta: XYPosition) => Promise<boolean>;
  updateConnection: UpdateConnection<InternalNode<NodeType>>;
  cancelConnection: () => void;
  reset(): void;
}

/**
 * The full store: the reactive state class plus the imperative actions.
 */
export type FlowStore<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
> = NgFlowStore<NodeType, EdgeType> & NgFlowStoreActions<NodeType, EdgeType>;
