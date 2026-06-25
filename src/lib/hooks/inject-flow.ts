import {
  evaluateAbsolutePosition,
  getElementsToRemove,
  getNodesBounds,
  getOverlappingArea,
  getViewportForBounds,
  isRectObject,
  nodeToRect,
  pointToRendererPoint,
  rendererPointToPoint,
  type FitBoundsOptions,
  type HandleConnection,
  type HandleType,
  type Rect,
  type SetCenterOptions,
  type Viewport,
  type ViewportHelperFunctionOptions,
  type XYPosition,
} from '../system';

import type { Edge, FitViewOptions, InternalNode, Node } from '../types';
import { isEdge, isNode } from '../utils';
import { injectStore } from './inject-store';

/**
 * The imperative NgFlow instance API. Angular port of Svelte Flow's
 * `useSvelteFlow` return type — a bag of helper functions for reading/mutating
 * nodes, edges and the viewport, plus geometry helpers.
 *
 * @public
 */
export interface NgFlowInstance<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  zoomIn: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  zoomOut: (options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  getInternalNode: (id: string) => InternalNode<NodeType> | undefined;
  getNode: (id: string) => NodeType | undefined;
  getNodes: (ids?: string[]) => NodeType[];
  getEdge: (id: string) => EdgeType | undefined;
  getEdges: (ids?: string[]) => EdgeType[];
  setZoom: (zoomLevel: number, options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  getZoom: () => number;
  setCenter: (x: number, y: number, options?: SetCenterOptions) => Promise<boolean>;
  setViewport: (viewport: Viewport, options?: ViewportHelperFunctionOptions) => Promise<boolean>;
  getViewport: () => Viewport;
  fitView: (options?: FitViewOptions<NodeType>) => Promise<boolean>;
  getIntersectingNodes: (
    nodeOrRect: NodeType | { id: NodeType['id'] } | Rect,
    partially?: boolean,
    nodesToIntersect?: NodeType[],
  ) => NodeType[];
  isNodeIntersecting: (
    nodeOrRect: NodeType | { id: NodeType['id'] } | Rect,
    area: Rect,
    partially?: boolean,
  ) => boolean;
  fitBounds: (bounds: Rect, options?: FitBoundsOptions) => Promise<boolean>;
  deleteElements: (params: {
    nodes?: (Partial<NodeType> & { id: string })[];
    edges?: (Partial<EdgeType> & { id: string })[];
  }) => Promise<{ deletedNodes: NodeType[]; deletedEdges: EdgeType[] }>;
  screenToFlowPosition: (
    clientPosition: XYPosition,
    options?: { snapToGrid: boolean },
  ) => XYPosition;
  flowToScreenPosition: (flowPosition: XYPosition) => XYPosition;
  updateNode: (
    id: string,
    nodeUpdate: Partial<NodeType> | ((node: NodeType) => Partial<NodeType>),
    options?: { replace: boolean },
  ) => void;
  updateNodeData: (
    id: string,
    dataUpdate: Partial<NodeType['data']> | ((node: NodeType) => Partial<NodeType['data']>),
    options?: { replace: boolean },
  ) => void;
  updateEdge: (
    id: string,
    edgeUpdate: Partial<EdgeType> | ((edge: EdgeType) => Partial<EdgeType>),
    options?: { replace: boolean },
  ) => void;
  toObject: () => { nodes: NodeType[]; edges: EdgeType[]; viewport: Viewport };
  getNodesBounds: (nodes: (NodeType | InternalNode<NodeType> | string)[]) => Rect;
  getHandleConnections: (params: {
    type: HandleType;
    nodeId: string;
    id?: string | null;
  }) => HandleConnection[];
}

/**
 * Hook for accessing the NgFlow instance. Angular port of Svelte Flow's
 * `useSvelteFlow`. Call in an injection context (component/directive
 * constructor or field initializer).
 *
 * @public
 */
export function injectFlow<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>(): NgFlowInstance<NodeType, EdgeType> {
  const store = injectStore<NodeType, EdgeType>();

  const getNodeRect = (node: NodeType | { id: NodeType['id'] }): Rect | null => {
    const nodeToUse = isNode(node) ? node : store.nodeLookup.get(node.id)?.internals.userNode;
    if (!nodeToUse) {
      return null;
    }

    const position = nodeToUse.parentId
      ? evaluateAbsolutePosition(
          nodeToUse.position,
          nodeToUse.measured,
          nodeToUse.parentId,
          store.nodeLookup,
          store.nodeOrigin,
        )
      : nodeToUse.position;

    const nodeWithPosition = {
      ...nodeToUse,
      position,
      width: nodeToUse.measured?.width ?? nodeToUse.width,
      height: nodeToUse.measured?.height ?? nodeToUse.height,
    };

    return nodeToRect(nodeWithPosition);
  };

  function updateNode(
    id: string,
    nodeUpdate: Partial<NodeType> | ((node: NodeType) => Partial<NodeType>),
    options: { replace: boolean } = { replace: false },
  ) {
    store.nodes = store.nodes.map((node) => {
      if (node.id === id) {
        const nextNode = typeof nodeUpdate === 'function' ? nodeUpdate(node) : nodeUpdate;
        return options.replace && isNode<NodeType>(nextNode) ? nextNode : { ...node, ...nextNode };
      }
      return node;
    });
  }

  function updateEdge(
    id: string,
    edgeUpdate: Partial<EdgeType> | ((edge: EdgeType) => Partial<EdgeType>),
    options: { replace: boolean } = { replace: false },
  ) {
    store.edges = store.edges.map((edge) => {
      if (edge.id === id) {
        const nextEdge = typeof edgeUpdate === 'function' ? edgeUpdate(edge) : edgeUpdate;
        return options.replace && isEdge<EdgeType>(nextEdge) ? nextEdge : { ...edge, ...nextEdge };
      }
      return edge;
    });
  }

  const getInternalNode = (id: string) => store.nodeLookup.get(id);

  return {
    zoomIn: store.zoomIn,
    zoomOut: store.zoomOut,
    getInternalNode,
    getNode: (id) => getInternalNode(id)?.internals.userNode,
    getNodes: (ids) => (ids === undefined ? store.nodes : getElements(store.nodeLookup, ids)),
    getEdge: (id) => store.edgeLookup.get(id),
    getEdges: (ids) => (ids === undefined ? store.edges : getElements(store.edgeLookup, ids)),
    setZoom: async (zoomLevel, options) => {
      const panZoom = store.panZoom;
      return panZoom ? panZoom.scaleTo(zoomLevel, options) : false;
    },
    getZoom: () => store.viewport.zoom,
    setViewport: async (nextViewport, options) => {
      const currentViewport = store.viewport;
      if (!store.panZoom) {
        return false;
      }

      await store.panZoom.setViewport(
        {
          x: nextViewport.x ?? currentViewport.x,
          y: nextViewport.y ?? currentViewport.y,
          zoom: nextViewport.zoom ?? currentViewport.zoom,
        },
        options,
      );
      return true;
    },
    getViewport: () => ({ ...store.viewport }),
    setCenter: (x, y, options) => store.setCenter(x, y, options),
    fitView: (options) => store.fitView(options),
    fitBounds: async (bounds, options) => {
      if (!store.panZoom) {
        return false;
      }

      const viewport = getViewportForBounds(
        bounds,
        store.width,
        store.height,
        store.minZoom,
        store.maxZoom,
        options?.padding ?? 0.1,
      );

      await store.panZoom.setViewport(viewport, {
        duration: options?.duration,
        ease: options?.ease,
        interpolate: options?.interpolate,
      });
      return true;
    },
    getIntersectingNodes: (nodeOrRect, partially = true, nodesToIntersect) => {
      const isRect = isRectObject(nodeOrRect);
      const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);

      if (!nodeRect) {
        return [];
      }

      return (nodesToIntersect || store.nodes).filter((n) => {
        const internalNode = store.nodeLookup.get(n.id);
        if (!internalNode || (!isRect && n.id === nodeOrRect.id)) {
          return false;
        }

        const currNodeRect = nodeToRect(internalNode);
        const overlappingArea = getOverlappingArea(currNodeRect, nodeRect);
        const partiallyVisible = partially && overlappingArea > 0;

        return (
          partiallyVisible ||
          overlappingArea >= currNodeRect.width * currNodeRect.height ||
          overlappingArea >= nodeRect.width * nodeRect.height
        );
      });
    },
    isNodeIntersecting: (nodeOrRect, area, partially = true) => {
      const isRect = isRectObject(nodeOrRect);
      const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);

      if (!nodeRect) {
        return false;
      }

      const overlappingArea = getOverlappingArea(nodeRect, area);
      const partiallyVisible = partially && overlappingArea > 0;

      return (
        partiallyVisible ||
        overlappingArea >= area.width * area.height ||
        overlappingArea >= nodeRect.width * nodeRect.height
      );
    },
    deleteElements: async ({ nodes: nodesToRemove = [], edges: edgesToRemove = [] }) => {
      const { nodes: matchingNodes, edges: matchingEdges } = await getElementsToRemove<
        NodeType,
        EdgeType
      >({
        nodesToRemove,
        edgesToRemove,
        nodes: store.nodes,
        edges: store.edges,
        onBeforeDelete: store.onbeforedelete,
      });

      if (matchingNodes) {
        store.nodes = store.nodes.filter((node) => !matchingNodes.some(({ id }) => id === node.id));
      }

      if (matchingEdges) {
        store.edges = store.edges.filter((edge) => !matchingEdges.some(({ id }) => id === edge.id));
      }

      if (matchingNodes.length > 0 || matchingEdges.length > 0) {
        store.ondelete?.({ nodes: matchingNodes, edges: matchingEdges });
      }

      return { deletedNodes: matchingNodes, deletedEdges: matchingEdges };
    },
    screenToFlowPosition: (position, options = { snapToGrid: true }) => {
      if (!store.domNode) {
        return position;
      }

      const _snapGrid = options.snapToGrid ? store.snapGrid : false;
      const { x, y, zoom } = store.viewport;
      const { x: domX, y: domY } = store.domNode.getBoundingClientRect();
      const correctedPosition = { x: position.x - domX, y: position.y - domY };

      return pointToRendererPoint(
        correctedPosition,
        [x, y, zoom],
        _snapGrid !== null,
        _snapGrid || [1, 1],
      );
    },
    flowToScreenPosition: (position) => {
      if (!store.domNode) {
        return position;
      }

      const { x, y, zoom } = store.viewport;
      const { x: domX, y: domY } = store.domNode.getBoundingClientRect();
      const rendererPosition = rendererPointToPoint(position, [x, y, zoom]);

      return { x: rendererPosition.x + domX, y: rendererPosition.y + domY };
    },
    toObject: () =>
      structuredClone({
        nodes: [...store.nodes],
        edges: [...store.edges],
        viewport: { ...store.viewport },
      }),
    updateNode,
    updateNodeData: (id, dataUpdate, options) => {
      const node = store.nodeLookup.get(id)?.internals.userNode;
      if (!node) {
        return;
      }

      const nextData = typeof dataUpdate === 'function' ? dataUpdate(node) : dataUpdate;
      updateNode(id, (n) => ({
        ...n,
        data: options?.replace ? nextData : { ...n.data, ...nextData },
      }));
    },
    updateEdge,
    getNodesBounds: (nodes) =>
      getNodesBounds(nodes, { nodeLookup: store.nodeLookup, nodeOrigin: store.nodeOrigin }),
    getHandleConnections: ({ type, id, nodeId }) =>
      Array.from(store.connectionLookup.get(`${nodeId}-${type}-${id ?? null}`)?.values() ?? []),
  };
}

function getElements<NodeType extends Node = Node>(
  lookup: Map<string, InternalNode<NodeType>>,
  ids: string[],
): NodeType[];
function getElements<EdgeType extends Edge = Edge>(
  lookup: Map<string, EdgeType>,
  ids: string[],
): EdgeType[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElements(lookup: Map<string, any>, ids: string[]): any[] {
  const result = [];

  for (const id of ids) {
    const item = lookup.get(id);
    if (item) {
      const element = 'internals' in item ? item.internals?.userNode : item;
      result.push(element);
    }
  }

  return result;
}
