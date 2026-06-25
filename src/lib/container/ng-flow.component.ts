import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  untracked,
} from '@angular/core';

import {
  ConnectionLineType,
  PanOnScrollMode,
  type ColorMode,
  type ConnectionMode,
  type CoordinateExtent,
  type NodeOrigin,
  type OnPanZoom,
  type PanelPosition,
  type ProOptions,
  type SnapGrid,
  type Viewport,
} from '../system';

import { FLOW_STORE } from '../store/context';
import { createStore } from '../store/create-store';
import type { FlowProps } from '../store/flow-props';
import type { FlowStore } from '../store/types';
import type {
  Edge,
  EdgeTypes,
  FitViewOptions,
  Node,
  NodeTypes,
  ClassValue,
} from '../types';

import { ZoomComponent } from './zoom.component';
import { PaneComponent } from './pane.component';
import { ViewportComponent } from './viewport.component';
import { NodeRendererComponent } from './node-renderer.component';
import { EdgeRendererComponent } from './edge-renderer.component';
import { AttributionComponent } from './attribution.component';

/**
 * The root NgFlow component. Angular port of Svelte Flow's `SvelteFlow`. Creates
 * the reactive store from its inputs, provides it to the whole subtree via
 * {@link FLOW_STORE}, and lays out the pan/zoom → pane → viewport → renderer
 * stack.
 *
 * GĐ 2 wires rendering, pan/zoom, node dragging and box-selection. KeyHandler,
 * ConnectionLine, NodeSelection, A11y descriptions and the remaining hooks land
 * in later phases.
 */
@Component({
  selector: 'ng-flow, angular-flow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ZoomComponent,
    PaneComponent,
    ViewportComponent,
    NodeRendererComponent,
    EdgeRendererComponent,
    AttributionComponent,
  ],
  providers: [{ provide: FLOW_STORE, useFactory: () => inject(NgFlowComponent).store }],
  host: {
    '[class]': 'hostClasses()',
    '[style]': 'style()',
    '[style.width]': 'widthPx()',
    '[style.height]': 'heightPx()',
    role: 'application',
    'data-testid': 'ng-flow__wrapper',
    '(scroll)': 'onScroll($event)',
  },
  template: `
    <ng-flow-zoom
      [panOnScrollMode]="panOnScrollMode()"
      [preventScrolling]="preventScrolling()"
      [zoomOnScroll]="zoomOnScroll()"
      [zoomOnDoubleClick]="zoomOnDoubleClick()"
      [zoomOnPinch]="zoomOnPinch()"
      [panOnScroll]="panOnScroll()"
      [panOnScrollSpeed]="panOnScrollSpeed()"
      [panOnDrag]="panOnDrag()"
      [paneClickDistance]="paneClickDistance()"
      [selectionOnDrag]="selectionOnDrag()"
      [onmovestart]="onmovestart()"
      [onmove]="onmove()"
      [onmoveend]="onmoveend()"
      [oninit]="oninit()"
    >
      <ng-flow-pane
        [panOnDrag]="panOnDrag()"
        [paneClickDistance]="paneClickDistance()"
        [selectionOnDrag]="selectionOnDrag()"
        [autoPanOnSelection]="autoPanOnSelection()"
      >
        <ng-flow-viewport>
          <div class="ng-flow__viewport-back ng-flow__container"></div>
          <ng-flow-edge-renderer />
          <div class="ng-flow__edge-labels ng-flow__container"></div>
          <ng-flow-node-renderer [nodeClickDistance]="nodeClickDistance()" />
          <div class="ng-flow__viewport-front ng-flow__container"></div>
        </ng-flow-viewport>
      </ng-flow-pane>
    </ng-flow-zoom>
    <ng-flow-attribution [proOptions]="proOptions()" [position]="attributionPosition()" />
    <ng-content />
  `,
})
export class NgFlowComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge>
  implements OnDestroy
{
  private readonly hostEl = inject(ElementRef<HTMLElement>).nativeElement;

  // --- two-way model state ---
  readonly nodes = model<NodeType[]>([]);
  readonly edges = model<EdgeType[]>([]);
  readonly viewport = model<Viewport | undefined>(undefined);

  // --- fixed size ---
  readonly width = input<number | undefined>(undefined);
  readonly height = input<number | undefined>(undefined);

  // --- common config inputs (all optional; the store falls back to defaults) ---
  readonly id = input<string | undefined>(undefined);
  readonly nodeTypes = input<NodeTypes | undefined>(undefined);
  readonly edgeTypes = input<EdgeTypes | undefined>(undefined);
  readonly fitView = input<boolean | undefined>(undefined);
  readonly fitViewOptions = input<FitViewOptions<NodeType> | undefined>(undefined);
  readonly minZoom = input<number | undefined>(undefined);
  readonly maxZoom = input<number | undefined>(undefined);
  readonly initialViewport = input<Viewport | undefined>(undefined);
  readonly nodeOrigin = input<NodeOrigin | undefined>(undefined);
  readonly snapGrid = input<SnapGrid | undefined>(undefined);
  readonly connectionMode = input<ConnectionMode | undefined>(undefined);
  readonly connectionLineType = input<ConnectionLineType>(ConnectionLineType.Bezier);
  readonly colorMode = input<ColorMode | undefined>(undefined);
  readonly nodesDraggable = input<boolean | undefined>(undefined);
  readonly nodesConnectable = input<boolean | undefined>(undefined);
  readonly elementsSelectable = input<boolean | undefined>(undefined);
  readonly selectNodesOnDrag = input<boolean | undefined>(undefined);
  readonly nodeDragThreshold = input<number | undefined>(undefined);
  readonly translateExtent = input<CoordinateExtent | undefined>(undefined);
  readonly nodeExtent = input<CoordinateExtent | undefined>(undefined);
  readonly onlyRenderVisibleElements = input<boolean | undefined>(undefined);
  readonly defaultMarkerColor = input<string | null | undefined>(undefined);
  readonly proOptions = input<ProOptions | undefined>(undefined);
  readonly attributionPosition = input<PanelPosition>('bottom-right');
  readonly class = input<ClassValue | undefined>(undefined);
  readonly style = input<string | undefined>(undefined);

  // --- pan/zoom inputs (forwarded to Zoom/Pane) ---
  readonly panOnScrollMode = input<PanOnScrollMode>(PanOnScrollMode.Free);
  readonly preventScrolling = input<boolean>(true);
  readonly zoomOnScroll = input<boolean>(true);
  readonly zoomOnDoubleClick = input<boolean>(true);
  readonly zoomOnPinch = input<boolean>(true);
  readonly panOnScroll = input<boolean>(false);
  readonly panOnScrollSpeed = input<number>(0.5);
  readonly panOnDrag = input<boolean | number[]>(true);
  readonly paneClickDistance = input<number>(1);
  readonly nodeClickDistance = input<number>(1);
  readonly selectionOnDrag = input<boolean>(false);
  readonly autoPanOnSelection = input<boolean>(true);

  // --- lifecycle / move callbacks ---
  readonly onmovestart = input<OnPanZoom | undefined>(undefined);
  readonly onmove = input<OnPanZoom | undefined>(undefined);
  readonly onmoveend = input<OnPanZoom | undefined>(undefined);
  readonly oninit = input<(() => void) | undefined>(undefined);

  // --- assembled props for the store ---
  private readonly props = computed<FlowProps<NodeType, EdgeType>>(() => ({
    id: this.id(),
    nodeTypes: this.nodeTypes(),
    edgeTypes: this.edgeTypes(),
    fitView: this.fitView(),
    fitViewOptions: this.fitViewOptions(),
    minZoom: this.minZoom(),
    maxZoom: this.maxZoom(),
    initialViewport: this.initialViewport(),
    nodeOrigin: this.nodeOrigin(),
    snapGrid: this.snapGrid(),
    connectionMode: this.connectionMode(),
    connectionLineType: this.connectionLineType(),
    colorMode: this.colorMode(),
    nodesDraggable: this.nodesDraggable(),
    nodesConnectable: this.nodesConnectable(),
    elementsSelectable: this.elementsSelectable(),
    selectNodesOnDrag: this.selectNodesOnDrag(),
    nodeDragThreshold: this.nodeDragThreshold(),
    translateExtent: this.translateExtent(),
    nodeExtent: this.nodeExtent(),
    onlyRenderVisibleElements: this.onlyRenderVisibleElements(),
    defaultMarkerColor: this.defaultMarkerColor(),
    proOptions: this.proOptions(),
    attributionPosition: this.attributionPosition(),
    class: this.class(),
    style: this.style(),
  }));

  /** The reactive store, provided to the subtree via {@link FLOW_STORE}. */
  readonly store: FlowStore<NodeType, EdgeType> = createStore<NodeType, EdgeType>({
    props: this.props,
    width: this.width,
    height: this.height,
    nodes: this.nodes,
    edges: this.edges,
    viewport: this.viewport,
  });

  readonly widthPx = computed(() => {
    const w = this.width();
    return w === undefined ? null : `${w}px`;
  });
  readonly heightPx = computed(() => {
    const h = this.height();
    return h === undefined ? null : `${h}px`;
  });

  readonly hostClasses = computed(() => {
    const classValue = this.class();
    const classes = ['ng-flow', 'ng-flow__container', this.store.colorMode];
    if (typeof classValue === 'string') classes.push(classValue);
    return classes.filter(Boolean).join(' ');
  });

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Selection-change notification (mirrors SvelteFlow's $effect).
    effect(() => {
      const params = { nodes: this.store.selectedNodes, edges: this.store.selectedEdges };
      untracked(() => this.store.flowProps.onselectionchange)?.(params);
      for (const handler of this.store.selectionChangeHandlers.values()) {
        handler(params);
      }
    });

    afterNextRender(() => {
      this.store.domNode = this.hostEl;
      // Measure the container unless a fixed size is provided.
      this.store.width = this.hostEl.clientWidth;
      this.store.height = this.hostEl.clientHeight;
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.store.width = this.hostEl.clientWidth;
          this.store.height = this.hostEl.clientHeight;
        });
        this.resizeObserver.observe(this.hostEl);
      }
    });
  }

  /** Undo scroll shifts when off-screen elements are focused. */
  onScroll(event: Event): void {
    (event.currentTarget as HTMLElement).scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.store.reset();
  }
}
