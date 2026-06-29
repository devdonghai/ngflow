import { computed, linkedSignal, signal, untracked, type Signal } from '@angular/core';

import {
  infiniteExtent,
  SelectionMode,
  ConnectionMode,
  createDevWarn,
  adoptUserNodes,
  getViewportForBounds,
  updateConnectionLookup,
  initialConnection,
  mergeAriaLabelConfig,
  getInternalNodesBounds,
  createMarkerIds,
  pointToRendererPoint,
  fitViewport,
  type SelectionRect,
  type SnapGrid,
  type MarkerProps,
  type PanZoomInstance,
  type CoordinateExtent,
  type NodeOrigin,
  type OnError,
  type Viewport,
  type OnConnect,
  type OnConnectStart,
  type OnConnectEnd,
  type NodeLookup,
  type ConnectionState,
  type EdgeLookup,
  type ConnectionLookup,
  type ParentLookup,
  type ColorModeClass,
  type Transform,
  type Handle,
  type OnReconnect,
  type OnReconnectStart,
  type OnReconnectEnd,
  type AriaLabelConfig,
  type ZIndexMode,
} from '../system';

import type {
  NodeTypes,
  EdgeTypes,
  FitViewOptions,
  OnDelete,
  OnBeforeConnect,
  OnBeforeDelete,
  IsValidConnection,
  Edge,
  Node,
  EdgeLayouted,
  InternalNode,
  OnBeforeReconnect,
  OnSelectionChange,
  OnSelectionDrag,
} from '../types';

import { initialNodeTypes, initialEdgeTypes } from './initial-types';
import { mediaQuerySignal } from './media-query';
import type { StoreSignals } from './types';
import {
  getLayoutedEdges,
  getVisibleNodes,
  type EdgeLayoutAllOptions,
} from './visible-elements';

const devWarn = createDevWarn('NgFlow', 'https://xyflow.com/');

function getInitialViewport<NodeType extends Node = Node>(
  fitView: boolean | undefined,
  initialViewport: Viewport | undefined,
  width: number,
  height: number,
  nodeLookup: NodeLookup<InternalNode<NodeType>>,
): Viewport {
  if (fitView && !initialViewport && width && height) {
    const bounds = getInternalNodesBounds(nodeLookup, {
      filter: (node) =>
        !!((node.width || node.initialWidth) && (node.height || node.initialHeight)),
    });
    return getViewportForBounds(bounds, width, height, 0.5, 2, 0.1);
  } else {
    return initialViewport ?? { x: 0, y: 0, zoom: 1 };
  }
}

/**
 * The reactive heart of NgFlow, ported from Svelte Flow's `getInitialStore`.
 *
 * Mapping of Svelte 5 runes to Angular signals:
 *   - `$state.raw(x)`            -> `signal(x)` (exposed via a getter/setter pair)
 *   - `$derived(expr)`           -> `computed(() => expr)`
 *   - `$derived` that an action  -> `linkedSignal(() => expr)` (recomputes from
 *     also reassigns                 props but can be imperatively overwritten)
 *
 * Every field is exposed as a plain property (getter/setter over the underlying
 * signal) so the rendering/interaction layers read `store.nodes` exactly like
 * the Svelte components did.
 */
export class NgFlowStore<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  constructor(private readonly signals: StoreSignals<NodeType, EdgeType>) {
    const props = untracked(this.signals.props);
    this.fitViewOptions = props.fitViewOptions;

    this._viewport = signal<Viewport>(
      getInitialViewport(
        props.fitView,
        props.initialViewport,
        untracked(this.signals.width) ?? 0,
        untracked(this.signals.height) ?? 0,
        this.nodeLookup,
      ),
    );

    this._prefersDark = mediaQuerySignal(
      '(prefers-color-scheme: dark)',
      props.colorModeSSR === 'dark',
    );
  }

  // Getter (not a field initializer): parameter property `signals` is assigned
  // in the constructor body, which runs *after* field initializers under
  // ES2022 `useDefineForClassFields`. A getter defers the read until call time.
  private get p() {
    return this.signals.props;
  }

  /**
   * The current resolved {@link FlowProps}. Reading this inside a `computed`,
   * `effect`, or template subscribes to prop changes. Renderers use it to reach
   * the node/edge/pane event callbacks without prop-drilling them down the tree.
   */
  get flowProps() {
    return this.p();
  }

  // --- non-reactive lookups (mutated in place, like the Svelte Maps) ---
  nodeLookup: NodeLookup<InternalNode<NodeType>> = new Map();
  parentLookup: ParentLookup<InternalNode<NodeType>> = new Map();
  connectionLookup: ConnectionLookup = new Map();
  edgeLookup: EdgeLookup<EdgeType> = new Map();

  // --- raw reactive state ($state.raw) ---
  private readonly _domNode = signal<HTMLElement | null>(null);
  get domNode() {
    return this._domNode();
  }
  set domNode(value: HTMLElement | null) {
    this._domNode.set(value);
  }

  private readonly _panZoom = signal<PanZoomInstance | null>(null);
  get panZoom() {
    return this._panZoom();
  }
  set panZoom(value: PanZoomInstance | null) {
    this._panZoom.set(value);
  }

  private readonly _zIndexMode = linkedSignal<ZIndexMode>(() => this.p().zIndexMode ?? 'basic');
  get zIndexMode() {
    return this._zIndexMode();
  }
  set zIndexMode(value: ZIndexMode) {
    this._zIndexMode.set(value);
  }

  // width/height come from the component as inputs
  private readonly _width = linkedSignal<number>(() => this.signals.width() ?? 0);
  get width() {
    return this._width();
  }
  set width(value: number) {
    this._width.set(value);
  }

  private readonly _height = linkedSignal<number>(() => this.signals.height() ?? 0);
  get height() {
    return this._height();
  }
  set height(value: number) {
    this._height.set(value);
  }

  // --- derived id ---
  private readonly _flowId = computed(() => this.p().id ?? '1');
  get flowId() {
    return this._flowId();
  }

  // --- nodes: adoptUserNodes side-effect lives in a computed (like Svelte's $derived.by) ---
  private readonly _nodesInitialized = computed<boolean>(() => {
    const { nodesInitialized } = adoptUserNodes(
      this.signals.nodes(),
      this.nodeLookup,
      this.parentLookup,
      {
        nodeExtent: this.nodeExtent,
        nodeOrigin: this.nodeOrigin,
        elevateNodesOnSelect: this.p().elevateNodesOnSelect ?? true,
        checkEquality: true,
        zIndexMode: this.zIndexMode,
      },
    );

    // Seed the fitView queue from the (now-bound) prop exactly once.
    if (!this.fitViewSeeded) {
      this.fitViewSeeded = true;
      if (this.p().fitView) {
        this.fitViewQueued = true;
      }
    }

    if (this.fitViewQueued && nodesInitialized) {
      if (this.fitViewOptions?.duration) {
        this.resolveFitView();
      } else {
        queueMicrotask(() => {
          this.resolveFitView();
        });
      }
    }

    return nodesInitialized;
  });
  get nodesInitialized() {
    return this._nodesInitialized();
  }

  private readonly _viewportInitialized = computed(() => this._panZoom() !== null);
  get viewportInitialized() {
    return this._viewportInitialized();
  }

  // edges with connection-lookup side-effect
  private readonly _edges = computed<EdgeType[]>(() => {
    const edges = this.signals.edges();
    updateConnectionLookup(this.connectionLookup, this.edgeLookup, edges);
    return edges;
  });

  get nodes(): NodeType[] {
    // Read nodesInitialized to trigger adoptUserNodes, mirroring Svelte's getter.
    this._nodesInitialized();
    return this.signals.nodes();
  }
  set nodes(nodes: NodeType[]) {
    this.signals.nodes.set(nodes);
  }

  get edges(): EdgeType[] {
    return this._edges();
  }
  set edges(edges: EdgeType[]) {
    this.signals.edges.set(edges);
  }

  // --- selected nodes/edges (stateful memoization, ported verbatim) ---
  private _prevSelectedNodes: NodeType[] = [];
  private _prevSelectedNodeIds = new Set<string>();
  private readonly _selectedNodes = computed<NodeType[]>(() => {
    const selectedNodesCount = this._prevSelectedNodeIds.size;
    const selectedNodeIds = new Set<string>();
    const selectedNodes = this.nodes.filter((node) => {
      if (node.selected) {
        selectedNodeIds.add(node.id);
        this._prevSelectedNodeIds.delete(node.id);
      }
      return node.selected;
    });

    if (selectedNodesCount !== selectedNodeIds.size || this._prevSelectedNodeIds.size > 0) {
      this._prevSelectedNodes = selectedNodes;
    }

    this._prevSelectedNodeIds = selectedNodeIds;
    return this._prevSelectedNodes;
  });
  get selectedNodes() {
    return this._selectedNodes();
  }

  private _prevSelectedEdges: EdgeType[] = [];
  private _prevSelectedEdgeIds = new Set<string>();
  private readonly _selectedEdges = computed<EdgeType[]>(() => {
    const selectedEdgesCount = this._prevSelectedEdgeIds.size;
    const selectedEdgeIds = new Set<string>();
    const selectedEdges = this.edges.filter((edge) => {
      if (edge.selected) {
        selectedEdgeIds.add(edge.id);
        this._prevSelectedEdgeIds.delete(edge.id);
      }
      return edge.selected;
    });
    if (selectedEdgesCount !== selectedEdgeIds.size || this._prevSelectedEdgeIds.size > 0) {
      this._prevSelectedEdges = selectedEdges;
    }
    this._prevSelectedEdgeIds = selectedEdgeIds;
    return this._prevSelectedEdges;
  });
  get selectedEdges() {
    return this._selectedEdges();
  }

  selectionChangeHandlers = new Map<symbol, OnSelectionChange<NodeType, EdgeType>>();

  // --- visible nodes/edges ---
  private _prevVisibleEdges = new Map<string, EdgeLayouted<EdgeType>>();
  private readonly _visible = computed(() => {
    const nodeLookup = this.nodeLookup;
    const edges = this._edges();
    const previousEdges = this._prevVisibleEdges;
    const connectionMode = this.connectionMode;
    const onerror = this.onerror;
    const onlyRenderVisibleElements = this.onlyRenderVisibleElements;
    const defaultEdgeOptions = this.defaultEdgeOptions;
    const zIndexMode = this.zIndexMode;

    // touch nodes to subscribe to changes
    void this.nodes;

    let visibleNodes: Map<string, InternalNode<NodeType>>;
    let visibleEdges: Map<string, EdgeLayouted<EdgeType>>;

    const options = {
      edges,
      defaultEdgeOptions,
      previousEdges,
      nodeLookup,
      connectionMode,
      elevateEdgesOnSelect: this.p().elevateEdgesOnSelect ?? true,
      zIndexMode,
      onerror,
    };

    if (onlyRenderVisibleElements) {
      const viewport = this.viewport;
      const width = this.width;
      const height = this.height;
      const transform: Transform = [viewport.x, viewport.y, viewport.zoom];

      visibleNodes = getVisibleNodes(nodeLookup, transform, width, height);
      visibleEdges = getLayoutedEdges({
        ...options,
        onlyRenderVisible: true,
        visibleNodes,
        transform,
        width,
        height,
      });
    } else {
      visibleNodes = this.nodeLookup;
      visibleEdges = getLayoutedEdges(options as EdgeLayoutAllOptions<NodeType, EdgeType>);
    }

    this._prevVisibleEdges = visibleEdges;

    return { nodes: visibleNodes, edges: visibleEdges };
  });
  get visible() {
    return this._visible();
  }

  // --- simple derived props ($derived) ---
  // Writable (linkedSignal) so the Controls "toggle interactivity" button can
  // flip them imperatively, mirroring Svelte Flow's bindable store props.
  private readonly _nodesDraggable = linkedSignal<boolean>(() => this.p().nodesDraggable ?? true);
  get nodesDraggable() {
    return this._nodesDraggable();
  }
  set nodesDraggable(value: boolean) {
    this._nodesDraggable.set(value);
  }
  private readonly _nodesConnectable = linkedSignal<boolean>(
    () => this.p().nodesConnectable ?? true,
  );
  get nodesConnectable() {
    return this._nodesConnectable();
  }
  set nodesConnectable(value: boolean) {
    this._nodesConnectable.set(value);
  }
  private readonly _elementsSelectable = linkedSignal<boolean>(
    () => this.p().elementsSelectable ?? true,
  );
  get elementsSelectable() {
    return this._elementsSelectable();
  }
  set elementsSelectable(value: boolean) {
    this._elementsSelectable.set(value);
  }
  private readonly _nodesFocusable = computed(() => this.p().nodesFocusable ?? true);
  get nodesFocusable() {
    return this._nodesFocusable();
  }
  private readonly _edgesFocusable = computed(() => this.p().edgesFocusable ?? true);
  get edgesFocusable() {
    return this._edgesFocusable();
  }
  private readonly _disableKeyboardA11y = computed(() => this.p().disableKeyboardA11y ?? false);
  get disableKeyboardA11y() {
    return this._disableKeyboardA11y();
  }

  private readonly _minZoom = linkedSignal<number>(() => this.p().minZoom ?? 0.5);
  get minZoom() {
    return this._minZoom();
  }
  set minZoom(value: number) {
    this._minZoom.set(value);
  }
  private readonly _maxZoom = linkedSignal<number>(() => this.p().maxZoom ?? 2);
  get maxZoom() {
    return this._maxZoom();
  }
  set maxZoom(value: number) {
    this._maxZoom.set(value);
  }

  private readonly _nodeOrigin = computed<NodeOrigin>(() => this.p().nodeOrigin ?? [0, 0]);
  get nodeOrigin() {
    return this._nodeOrigin();
  }
  private readonly _nodeExtent = computed<CoordinateExtent>(
    () => this.p().nodeExtent ?? infiniteExtent,
  );
  get nodeExtent() {
    return this._nodeExtent();
  }
  private readonly _translateExtent = linkedSignal<CoordinateExtent>(
    () => this.p().translateExtent ?? infiniteExtent,
  );
  get translateExtent() {
    return this._translateExtent();
  }
  set translateExtent(value: CoordinateExtent) {
    this._translateExtent.set(value);
  }

  private readonly _defaultEdgeOptions = computed<Partial<Edge>>(
    () => this.p().defaultEdgeOptions ?? {},
  );
  get defaultEdgeOptions() {
    return this._defaultEdgeOptions();
  }

  private readonly _nodeDragThreshold = computed(() => this.p().nodeDragThreshold ?? 1);
  get nodeDragThreshold() {
    return this._nodeDragThreshold();
  }
  private readonly _autoPanOnNodeDrag = computed(() => this.p().autoPanOnNodeDrag ?? true);
  get autoPanOnNodeDrag() {
    return this._autoPanOnNodeDrag();
  }
  private readonly _autoPanOnConnect = computed(() => this.p().autoPanOnConnect ?? true);
  get autoPanOnConnect() {
    return this._autoPanOnConnect();
  }
  private readonly _autoPanOnNodeFocus = computed(() => this.p().autoPanOnNodeFocus ?? true);
  get autoPanOnNodeFocus() {
    return this._autoPanOnNodeFocus();
  }
  private readonly _autoPanSpeed = computed(() => this.p().autoPanSpeed ?? 15);
  get autoPanSpeed() {
    return this._autoPanSpeed();
  }
  private readonly _connectionDragThreshold = computed(() => this.p().connectionDragThreshold ?? 1);
  get connectionDragThreshold() {
    return this._connectionDragThreshold();
  }

  // --- fitView state (plain mutable fields, like Svelte) ---
  // Seeded lazily from the `fitView` prop on the first `_nodesInitialized` run
  // rather than in the constructor: the store is built via a field initializer
  // while the host component is still constructing, before Angular has bound the
  // `[fitView]` input, so reading it in the constructor always sees `undefined`.
  fitViewQueued = false;
  private fitViewSeeded = false;
  fitViewOptions: FitViewOptions<NodeType> | undefined;
  fitViewResolver: PromiseWithResolvers<boolean> | null = null;

  private readonly _snapGrid = computed<SnapGrid | null>(() => this.p().snapGrid ?? null);
  get snapGrid() {
    return this._snapGrid();
  }

  // --- interaction raw state ---
  private readonly _dragging = signal(false);
  get dragging() {
    return this._dragging();
  }
  set dragging(value: boolean) {
    this._dragging.set(value);
  }
  private readonly _selectionRect = signal<SelectionRect | null>(null);
  get selectionRect() {
    return this._selectionRect();
  }
  set selectionRect(value: SelectionRect | null) {
    this._selectionRect.set(value);
  }
  private readonly _selectionKeyPressed = signal(false);
  get selectionKeyPressed() {
    return this._selectionKeyPressed();
  }
  set selectionKeyPressed(value: boolean) {
    this._selectionKeyPressed.set(value);
  }
  private readonly _multiselectionKeyPressed = signal(false);
  get multiselectionKeyPressed() {
    return this._multiselectionKeyPressed();
  }
  set multiselectionKeyPressed(value: boolean) {
    this._multiselectionKeyPressed.set(value);
  }
  private readonly _deleteKeyPressed = signal(false);
  get deleteKeyPressed() {
    return this._deleteKeyPressed();
  }
  set deleteKeyPressed(value: boolean) {
    this._deleteKeyPressed.set(value);
  }
  private readonly _panActivationKeyPressed = signal(false);
  get panActivationKeyPressed() {
    return this._panActivationKeyPressed();
  }
  set panActivationKeyPressed(value: boolean) {
    this._panActivationKeyPressed.set(value);
  }
  private readonly _zoomActivationKeyPressed = signal(false);
  get zoomActivationKeyPressed() {
    return this._zoomActivationKeyPressed();
  }
  set zoomActivationKeyPressed(value: boolean) {
    this._zoomActivationKeyPressed.set(value);
  }
  private readonly _selectionRectMode = signal<string | null>(null);
  get selectionRectMode() {
    return this._selectionRectMode();
  }
  set selectionRectMode(value: string | null) {
    this._selectionRectMode.set(value);
  }
  private readonly _ariaLiveMessage = signal<string>('');
  get ariaLiveMessage() {
    return this._ariaLiveMessage();
  }
  set ariaLiveMessage(value: string) {
    this._ariaLiveMessage.set(value);
  }
  private readonly _selectionMode = computed<SelectionMode>(
    () => this.p().selectionMode ?? SelectionMode.Partial,
  );
  get selectionMode() {
    return this._selectionMode();
  }

  // --- node/edge types (reassignable via setNodeTypes/setEdgeTypes) ---
  private readonly _nodeTypes = linkedSignal<NodeTypes>(() => ({
    ...initialNodeTypes,
    ...this.p().nodeTypes,
  }));
  get nodeTypes() {
    return this._nodeTypes();
  }
  set nodeTypes(value: NodeTypes) {
    this._nodeTypes.set(value);
  }
  private readonly _edgeTypes = linkedSignal<EdgeTypes>(() => ({
    ...initialEdgeTypes,
    ...this.p().edgeTypes,
  }));
  get edgeTypes() {
    return this._edgeTypes();
  }
  set edgeTypes(value: EdgeTypes) {
    this._edgeTypes.set(value);
  }

  private readonly _noPanClass = computed(() => this.p().noPanClass ?? 'nopan');
  get noPanClass() {
    return this._noPanClass();
  }
  private readonly _noDragClass = computed(() => this.p().noDragClass ?? 'nodrag');
  get noDragClass() {
    return this._noDragClass();
  }
  private readonly _noWheelClass = computed(() => this.p().noWheelClass ?? 'nowheel');
  get noWheelClass() {
    return this._noWheelClass();
  }
  private readonly _ariaLabelConfig = computed<AriaLabelConfig>(() =>
    mergeAriaLabelConfig(this.p().ariaLabelConfig),
  );
  get ariaLabelConfig() {
    return this._ariaLabelConfig();
  }

  // --- viewport ---
  private _viewport!: ReturnType<typeof signal<Viewport>>;
  get viewport(): Viewport {
    return this.signals.viewport() ?? this._viewport();
  }
  set viewport(newViewport: Viewport) {
    if (this.signals.viewport() !== undefined) {
      this.signals.viewport.set(newViewport);
    }
    this._viewport.set(newViewport);
  }

  // --- connection ---
  private readonly _connectionRaw = signal<ConnectionState<InternalNode<NodeType>>>(
    initialConnection as ConnectionState<InternalNode<NodeType>>,
  );
  get _connection() {
    return this._connectionRaw();
  }
  set _connection(value: ConnectionState<InternalNode<NodeType>>) {
    this._connectionRaw.set(value);
  }
  private readonly _connectionDerived = computed<ConnectionState<InternalNode<NodeType>>>(() => {
    const connection = this._connectionRaw();
    if (!connection.inProgress) {
      return connection;
    }
    const viewport = this.viewport;
    return {
      ...connection,
      to: pointToRendererPoint(connection.to, [viewport.x, viewport.y, viewport.zoom]),
    };
  });
  get connection() {
    return this._connectionDerived();
  }

  private readonly _connectionMode = computed<ConnectionMode>(
    () => this.p().connectionMode ?? ConnectionMode.Strict,
  );
  get connectionMode() {
    return this._connectionMode();
  }
  private readonly _connectionRadius = computed(() => this.p().connectionRadius ?? 20);
  get connectionRadius() {
    return this._connectionRadius();
  }
  private readonly _isValidConnection = computed<IsValidConnection<EdgeType>>(
    () => this.p().isValidConnection ?? (() => true),
  );
  get isValidConnection() {
    return this._isValidConnection();
  }

  private readonly _selectNodesOnDrag = computed(() => this.p().selectNodesOnDrag ?? true);
  get selectNodesOnDrag() {
    return this._selectNodesOnDrag();
  }

  private readonly _defaultMarkerColor = computed<string | null>(() =>
    this.p().defaultMarkerColor === undefined ? '#b1b1b7' : this.p().defaultMarkerColor!,
  );
  get defaultMarkerColor() {
    return this._defaultMarkerColor();
  }
  private readonly _markers = computed<MarkerProps[]>(() =>
    createMarkerIds(this.signals.edges(), {
      defaultColor: this.defaultMarkerColor,
      id: this.flowId,
      defaultMarkerStart: this.defaultEdgeOptions.markerStart,
      defaultMarkerEnd: this.defaultEdgeOptions.markerEnd,
    }),
  );
  get markers() {
    return this._markers();
  }
  private readonly _onlyRenderVisibleElements = computed(
    () => this.p().onlyRenderVisibleElements ?? false,
  );
  get onlyRenderVisibleElements() {
    return this._onlyRenderVisibleElements();
  }
  private readonly _onerror = computed<OnError>(() => this.p().onflowerror ?? devWarn);
  get onerror() {
    return this._onerror();
  }

  private readonly _ondelete = computed<OnDelete<NodeType, EdgeType> | undefined>(
    () => this.p().ondelete,
  );
  get ondelete() {
    return this._ondelete();
  }
  private readonly _onbeforedelete = computed<OnBeforeDelete<NodeType, EdgeType> | undefined>(
    () => this.p().onbeforedelete,
  );
  get onbeforedelete() {
    return this._onbeforedelete();
  }

  private readonly _onbeforeconnect = computed<OnBeforeConnect<EdgeType> | undefined>(
    () => this.p().onbeforeconnect,
  );
  get onbeforeconnect() {
    return this._onbeforeconnect();
  }
  private readonly _onconnect = computed<OnConnect | undefined>(() => this.p().onconnect);
  get onconnect() {
    return this._onconnect();
  }
  private readonly _onconnectstart = computed<OnConnectStart | undefined>(
    () => this.p().onconnectstart,
  );
  get onconnectstart() {
    return this._onconnectstart();
  }
  private readonly _onconnectend = computed<OnConnectEnd | undefined>(() => this.p().onconnectend);
  get onconnectend() {
    return this._onconnectend();
  }

  private readonly _onbeforereconnect = computed<OnBeforeReconnect<EdgeType> | undefined>(
    () => this.p().onbeforereconnect,
  );
  get onbeforereconnect() {
    return this._onbeforereconnect();
  }
  private readonly _onreconnect = computed<OnReconnect<EdgeType> | undefined>(
    () => this.p().onreconnect,
  );
  get onreconnect() {
    return this._onreconnect();
  }
  private readonly _onreconnectstart = computed<OnReconnectStart<EdgeType> | undefined>(
    () => this.p().onreconnectstart,
  );
  get onreconnectstart() {
    return this._onreconnectstart();
  }
  private readonly _onreconnectend = computed<OnReconnectEnd<NodeType, EdgeType> | undefined>(
    () => this.p().onreconnectend,
  );
  get onreconnectend() {
    return this._onreconnectend();
  }

  private readonly _clickConnect = computed(() => this.p().clickConnect ?? true);
  get clickConnect() {
    return this._clickConnect();
  }
  private readonly _onclickconnectstart = computed<OnConnectStart | undefined>(
    () => this.p().onclickconnectstart,
  );
  get onclickconnectstart() {
    return this._onclickconnectstart();
  }
  private readonly _onclickconnectend = computed<OnConnectEnd | undefined>(
    () => this.p().onclickconnectend,
  );
  get onclickconnectend() {
    return this._onclickconnectend();
  }
  private readonly _clickConnectStartHandle = signal<Pick<
    Handle,
    'id' | 'nodeId' | 'type'
  > | null>(null);
  get clickConnectStartHandle() {
    return this._clickConnectStartHandle();
  }
  set clickConnectStartHandle(value: Pick<Handle, 'id' | 'nodeId' | 'type'> | null) {
    this._clickConnectStartHandle.set(value);
  }

  private readonly _onselectiondrag = computed<OnSelectionDrag<NodeType> | undefined>(
    () => this.p().onselectiondrag,
  );
  get onselectiondrag() {
    return this._onselectiondrag();
  }
  private readonly _onselectiondragstart = computed<OnSelectionDrag<NodeType> | undefined>(
    () => this.p().onselectiondragstart,
  );
  get onselectiondragstart() {
    return this._onselectiondragstart();
  }
  private readonly _onselectiondragstop = computed<OnSelectionDrag<NodeType> | undefined>(
    () => this.p().onselectiondragstop,
  );
  get onselectiondragstop() {
    return this._onselectiondragstop();
  }

  resolveFitView = async () => {
    if (!this.panZoom) {
      return;
    }

    await fitViewport(
      {
        nodes: this.nodeLookup,
        width: this.width,
        height: this.height,
        panZoom: this.panZoom,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
      },
      this.fitViewOptions,
    );

    this.fitViewResolver?.resolve(true);
    this.fitViewQueued = false;
    this.fitViewOptions = undefined;
    this.fitViewResolver = null;
  };

  // Assigned in the constructor (see above): the initial value reads
  // `this.signals` eagerly, which is only valid once the parameter property
  // has been assigned in the constructor body.
  private readonly _prefersDark: Signal<boolean>;
  private readonly _colorMode = computed<ColorModeClass>(() => {
    const colorMode = this.p().colorMode;
    return colorMode === 'system'
      ? this._prefersDark()
        ? 'dark'
        : 'light'
      : (colorMode ?? 'light');
  });
  get colorMode() {
    return this._colorMode();
  }

  resetStoreValues() {
    this.dragging = false;
    this.selectionRect = null;
    this.selectionRectMode = null;
    this.selectionKeyPressed = false;
    this.multiselectionKeyPressed = false;
    this.deleteKeyPressed = false;
    this.panActivationKeyPressed = false;
    this.zoomActivationKeyPressed = false;
    this._connection = initialConnection as ConnectionState<InternalNode<NodeType>>;
    this.clickConnectStartHandle = null;
    this.viewport = this.p().initialViewport ?? { x: 0, y: 0, zoom: 1 };
    this.ariaLiveMessage = '';
  }
}
