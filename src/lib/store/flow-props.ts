import type { Type } from '@angular/core';
import type {
  ConnectionLineType,
  NodeOrigin,
  Viewport,
  SelectionMode,
  SnapGrid,
  OnMoveStart,
  OnMove,
  OnMoveEnd,
  CoordinateExtent,
  PanOnScrollMode,
  OnError,
  ConnectionMode,
  PanelPosition,
  ProOptions,
  ColorMode,
  OnConnect,
  OnConnectStart,
  OnConnectEnd,
  OnReconnect,
  OnReconnectStart,
  OnReconnectEnd,
  AriaLabelConfig,
  ZIndexMode,
} from '../system';

import type {
  Edge,
  Node,
  NodeTypes,
  KeyDefinition,
  EdgeTypes,
  DefaultEdgeOptions,
  FitViewOptions,
  OnDelete,
  OnBeforeConnect,
  OnBeforeDelete,
  IsValidConnection,
  OnBeforeReconnect,
  OnSelectionChange,
  ClassValue,
} from '../types';

import type {
  EdgeEvents,
  NodeEvents,
  NodeSelectionEvents,
  OnSelectionDrag,
  PaneEvents,
} from '../types/events';

/**
 * The complete set of configuration inputs for an NgFlow instance. Ported from
 * Svelte Flow's `SvelteFlowProps`; Svelte-specific bits are adapted:
 *   - `connectionLineComponent` is an Angular component `Type` instead of a Snippet.
 *   - DOM `ClassValue` is the framework-neutral alias from `../types`.
 */
export type FlowProps<NodeType extends Node = Node, EdgeType extends Edge = Edge> = NodeEvents<NodeType> &
  NodeSelectionEvents<NodeType> &
  EdgeEvents<EdgeType> &
  PaneEvents & {
    /** The id of the flow. Necessary when rendering multiple flows. */
    id?: string;
    /** Sets a fixed width for the flow. */
    width?: number;
    /** Sets a fixed height for the flow. */
    height?: number;
    /** An array of nodes to render in a flow. */
    nodes?: NodeType[];
    /** An array of edges to render in a flow. */
    edges?: EdgeType[];
    /** Custom node types, matched against `node.type`. */
    nodeTypes?: NodeTypes;
    /** Custom edge types, matched against `edge.type`. */
    edgeTypes?: EdgeTypes;
    /** Hold to select multiple elements with a selection box. @default 'Shift' */
    selectionKey?: KeyDefinition | KeyDefinition[] | null;
    /** Hold to pan the viewport. @default 'Space' */
    panActivationKey?: KeyDefinition | KeyDefinition[] | null;
    /** Press to delete selected nodes & edges. @default 'Backspace' */
    deleteKey?: KeyDefinition | KeyDefinition[] | null;
    /** Hold to select multiple elements by clicking. @default 'Meta'/'Ctrl' */
    multiSelectionKey?: KeyDefinition | KeyDefinition[] | null;
    /** Hold to zoom the viewport. @default 'Meta'/'Ctrl' */
    zoomActivationKey?: KeyDefinition | KeyDefinition[] | null;
    /** If set, the initial viewport shows all nodes & edges. */
    fitView?: boolean;
    /** Options used together with `fitView`. */
    fitViewOptions?: FitViewOptions<NodeType>;
    /** Node position relative to its coordinates. @default [0, 0] */
    nodeOrigin?: NodeOrigin;
    /** Pixels to drag before a node drag fires (vs click). @default 1 */
    nodeDragThreshold?: number;
    /** Mouse move tolerance for a pane click. @default 0 */
    paneClickDistance?: number;
    /** Mouse move tolerance for a node click. @default 0 */
    nodeClickDistance?: number;
    /** Pixels to move before a connection line drag starts. @default 1 */
    connectionDragThreshold?: number;
    /** Minimum zoom level. @default 0.5 */
    minZoom?: number;
    /** Maximum zoom level. @default 2 */
    maxZoom?: number;
    /** Initial position and zoom of the viewport. */
    initialViewport?: Viewport;
    /** Controlled viewport, used instead of the internal one. */
    viewport?: Viewport;
    /** Radius around a handle where a connection can be dropped. @default 20 */
    connectionRadius?: number;
    /** 'strict' or 'loose' handle connection mode. @default 'strict' */
    connectionMode?: ConnectionMode;
    /** Custom component rendered instead of the default connection line. */
    connectionLineComponent?: Type<unknown>;
    /** Styles applied to the connection line. */
    connectionLineStyle?: string;
    /** Styles applied to the connection line container. */
    connectionLineContainerStyle?: string;
    /** 'partial' selects partially-boxed nodes; 'full' requires full containment. @default 'full' */
    selectionMode?: SelectionMode;
    /** Whether nodes are selected automatically when dragged. */
    selectNodesOnDrag?: boolean;
    /** Grid that all nodes snap to. @example [20, 20] */
    snapGrid?: SnapGrid;
    /** Color of edge markers. `null` uses the `--xy-edge-stroke` CSS variable. */
    defaultMarkerColor?: string | null;
    /** Whether all nodes are draggable. @default true */
    nodesDraggable?: boolean;
    /** Pan speed while dragging a node or selection box. @default 15 */
    autoPanSpeed?: number;
    /** Pan the viewport when a node is focused. @default true */
    autoPanOnNodeFocus?: boolean;
    /** Whether all nodes are connectable. @default true */
    nodesConnectable?: boolean;
    /** Whether nodes & edges are selectable. @default true */
    elementsSelectable?: boolean;
    /** Whether nodes participate in Tab focus cycling. @default true */
    nodesFocusable?: boolean;
    /** Whether edges participate in Tab focus cycling. @default true */
    edgesFocusable?: boolean;
    /** Viewport panning boundary. @default infinite */
    translateExtent?: CoordinateExtent;
    /** Node placement boundary. @default infinite */
    nodeExtent?: CoordinateExtent;
    /** Allow page scroll while the pointer is over the flow. @default true */
    preventScrolling?: boolean;
    /** Zoom by scrolling inside the container. @default true */
    zoomOnScroll?: boolean;
    /** Zoom by double clicking. @default true */
    zoomOnDoubleClick?: boolean;
    /** Zoom by pinching. @default true */
    zoomOnPinch?: boolean;
    /** Pan by scrolling inside the container. @default false */
    panOnScroll?: boolean;
    /** Pan-on-scroll speed. @default 0.5 */
    panOnScrollSpeed?: number;
    /** Limit pan-on-scroll direction. @default 'free' */
    panOnScrollMode?: PanOnScrollMode;
    /** Pan by click-dragging, or an array of allowed mouse buttons. @default true */
    panOnDrag?: boolean | number[];
    /** Selection box without holding `selectionKey`. @default false */
    selectionOnDrag?: boolean;
    /** Only render nodes/edges visible in the viewport. @default false */
    onlyRenderVisibleElements?: boolean;
    /** Pan the viewport while making a new connection. @default true */
    autoPanOnConnect?: boolean;
    /** Pan the viewport while dragging a node. @default true */
    autoPanOnNodeDrag?: boolean;
    /** Pan when the cursor reaches the edge while box-selecting. @default true */
    autoPanOnSelection?: boolean;
    /** Defaults applied to all newly added edges. */
    defaultEdgeOptions?: DefaultEdgeOptions;
    /** Color scheme. @default 'system' */
    colorMode?: ColorMode;
    /** SSR fallback color mode when `colorMode` is 'system'. */
    colorModeSSR?: Omit<ColorMode, 'system'>;
    /** Class applied to the flow container. */
    class?: ClassValue;
    /** Styles applied to the flow container. */
    style?: string;
    /** Built-in edge type used for the connection line. @default Bezier */
    connectionLineType?: ConnectionLineType;
    /** Raise z-index of selected nodes. @default true */
    elevateNodesOnSelect?: boolean;
    /** Raise z-index of selected edges (or edges of selected nodes). @default true */
    elevateEdgesOnSelect?: boolean;
    /** Disable keyboard accessibility (arrow-key move, etc.). @default false */
    disableKeyboardA11y?: boolean;
    /** Class that disables node dragging. @default 'nodrag' */
    noDragClass?: string;
    /** Class that disables wheel zoom. @default 'nowheel' */
    noWheelClass?: string;
    /** Class that disables pane panning. @default 'nopan' */
    noPanClass?: string;
    /** Allow connections by clicking handles. */
    clickConnect?: boolean;
    /** Position of the attribution. @default 'bottom-right' */
    attributionPosition?: PanelPosition;
    /** Pro options (e.g. hiding the attribution). */
    proOptions?: ProOptions;
    /** Validate a new connection; return false to reject it. */
    isValidConnection?: IsValidConnection<EdgeType>;
    /** Called when the user begins to pan or zoom. */
    onmovestart?: OnMoveStart;
    /** Called when the user pans or zooms. */
    onmove?: OnMove;
    /** Called when the user stops panning or zooming. */
    onmoveend?: OnMoveEnd;
    /** Called when NgFlow encounters a recoverable error. */
    onflowerror?: OnError;
    /** Called when nodes or edges are deleted. */
    ondelete?: OnDelete<NodeType, EdgeType>;
    /** Called before deletion; return false to abort. */
    onbeforedelete?: OnBeforeDelete<NodeType, EdgeType>;
    /** Called when a new edge is created; may modify it. */
    onbeforeconnect?: OnBeforeConnect<EdgeType>;
    /** Called when a connection completes and an edge is created. */
    onconnect?: OnConnect;
    /** Called when a connection drag starts. */
    onconnectstart?: OnConnectStart;
    /** Called when a connection drag stops. */
    onconnectend?: OnConnectEnd;
    /** Called after an edge is reconnected. */
    onreconnect?: OnReconnect<EdgeType>;
    /** Called when a user starts reconnecting an edge. */
    onreconnectstart?: OnReconnectStart<EdgeType>;
    /** Called when a user stops reconnecting an edge. */
    onreconnectend?: OnReconnectEnd<NodeType, EdgeType>;
    /** Called when an edge is reconnected; may modify it. */
    onbeforereconnect?: OnBeforeReconnect<EdgeType>;
    /** Click-connect start. */
    onclickconnectstart?: OnConnectStart;
    /** Click-connect end. */
    onclickconnectend?: OnConnectEnd;
    /** Called when the flow finishes initializing. */
    oninit?: () => void;
    /** Called when the selected nodes & edges change. */
    onselectionchange?: OnSelectionChange<NodeType, EdgeType>;
    /** Called when a user starts dragging a selection box. */
    onselectiondragstart?: OnSelectionDrag<NodeType>;
    /** Called when a user drags a selection box. */
    onselectiondrag?: OnSelectionDrag<NodeType>;
    /** Called when a user stops dragging a selection box. */
    onselectiondragstop?: OnSelectionDrag<NodeType>;
    /** Called when the user starts dragging a selection box. */
    onselectionstart?: (event: PointerEvent) => void;
    /** Called when the user finishes dragging a selection box. */
    onselectionend?: (event: PointerEvent) => void;
    /** Overrides for customizable ARIA/UI labels. */
    ariaLabelConfig?: Partial<AriaLabelConfig>;
    /** How z-indexing is calculated. @default 'basic' */
    zIndexMode?: ZIndexMode;
  };
