import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
} from '@angular/core';

import {
  SelectionMode,
  getEventPosition,
  getNodesInside,
  calcAutoPan,
  pointToRendererPoint,
  rendererPointToPoint,
  type XYPosition,
} from '../system';

import { injectFlowStore } from '../store/context';
import type { Edge, Node } from '../types';

function isSetEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function toggleSelected<Item extends { id: string; selected?: boolean }>(ids: Set<string>) {
  return (item: Item): Item => {
    const isSelected = ids.has(item.id);
    if (!!item.selected !== isSelected) {
      return { ...item, selected: isSelected };
    }
    return item;
  };
}

/**
 * The interaction surface behind the viewport. Angular port of Svelte Flow's
 * `Pane`. Handles pane clicks, context menus and box-selection (with auto-pan).
 */
@Component({
  selector: 'ng-flow-pane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[class]': 'hostClasses()',
  },
})
export class PaneComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge>
  implements OnDestroy
{
  private readonly store = injectFlowStore<NodeType, EdgeType>();
  private readonly container = inject(ElementRef<HTMLElement>).nativeElement;

  readonly panOnDrag = input<boolean | number[]>(true);
  readonly paneClickDistance = input<number>(1);
  readonly selectionOnDrag = input<boolean>(false);
  readonly autoPanOnSelection = input<boolean>(true);

  private containerBounds: DOMRect | null = null;
  private connectionEndedOnPane = false;
  private selectedNodeIds = new Set<string>();
  private selectedEdgeIds = new Set<string>();
  private selectionInProgress = false;
  private autoPanId = 0;
  private position: XYPosition = { x: 0, y: 0 };
  private autoPanStarted = false;

  private readonly panOnDragActive = computed(
    () => this.store.panActivationKeyPressed || this.panOnDrag(),
  );
  private readonly isSelecting = computed(
    () =>
      this.store.selectionKeyPressed ||
      !!this.store.selectionRect ||
      (this.selectionOnDrag() && this.panOnDragActive() !== true),
  );
  private readonly isSelectionEnabled = computed(
    () =>
      this.store.elementsSelectable &&
      (this.isSelecting() || this.store.selectionRectMode === 'user'),
  );

  readonly hostClasses = computed(() => {
    const panOnDrag = this.panOnDrag();
    const classes = ['ng-flow__pane', 'ng-flow__container'];
    if (panOnDrag === true || (Array.isArray(panOnDrag) && panOnDrag.includes(0))) {
      classes.push('draggable');
    }
    if (this.store.dragging) classes.push('dragging');
    if (this.isSelecting()) classes.push('selection');
    return classes.join(' ');
  });

  constructor() {
    afterNextRender(() => {
      this.container.addEventListener(
        'pointerdown',
        (e: Event) => this.onPointerDownCapture(e as PointerEvent),
        { capture: true },
      );
      this.container.addEventListener('pointermove', (e: Event) =>
        this.onPointerMove(e as PointerEvent),
      );
      this.container.addEventListener('pointerup', (e: Event) =>
        this.onPointerUp(e as PointerEvent),
      );
      this.container.addEventListener('pointercancel', (e: Event) =>
        this.onPointerCancel(e as PointerEvent),
      );
      this.container.addEventListener('click', (e: Event) => this.onClickHandler(e as MouseEvent), {
        capture: true,
      });
      this.container.addEventListener('contextmenu', (e: Event) =>
        this.onContextMenu(e as MouseEvent),
      );
    });
  }

  ngOnDestroy(): void {
    this.cleanupAutoPan();
  }

  private onPointerDownCapture(event: PointerEvent) {
    if (!this.isSelectionEnabled()) return;
    this.containerBounds = this.container.getBoundingClientRect();
    if (!this.containerBounds) return;

    const eventTargetIsContainer = event.target === this.container;
    const isNoKeyEvent =
      !eventTargetIsContainer && !!(event.target as HTMLElement).closest('.nokey');
    const isSelectionActive =
      (this.selectionOnDrag() && eventTargetIsContainer) || this.store.selectionKeyPressed;

    if (
      isNoKeyEvent ||
      !this.isSelecting() ||
      !isSelectionActive ||
      event.button !== 0 ||
      !event.isPrimary
    ) {
      return;
    }

    (event.target as Partial<Element>)?.setPointerCapture?.(event.pointerId);
    this.selectionInProgress = false;
    this.autoPanStarted = false;

    const { x, y } = getEventPosition(event, this.containerBounds);
    const userSelectionFlowOrigin = pointToRendererPoint({ x, y }, [
      this.store.viewport.x,
      this.store.viewport.y,
      this.store.viewport.zoom,
    ]);

    this.store.selectionRect = {
      width: 0,
      height: 0,
      startX: userSelectionFlowOrigin.x,
      startY: userSelectionFlowOrigin.y,
      x,
      y,
    };

    if (!eventTargetIsContainer) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  private commitUserSelectionRect(mouseX: number, mouseY: number): void {
    const rect = this.store.selectionRect;
    if (rect?.startX === undefined || rect.startY === undefined) return;

    const userStartPosition = { x: rect.startX, y: rect.startY };
    const screenStart = rendererPointToPoint(userStartPosition, [
      this.store.viewport.x,
      this.store.viewport.y,
      this.store.viewport.zoom,
    ]);
    const nextUserSelectRect = {
      startX: userStartPosition.x,
      startY: userStartPosition.y,
      x: mouseX < screenStart.x ? mouseX : screenStart.x,
      y: mouseY < screenStart.y ? mouseY : screenStart.y,
      width: Math.abs(mouseX - screenStart.x),
      height: Math.abs(mouseY - screenStart.y),
    };

    const prevSelectedNodeIds = this.selectedNodeIds;
    const prevSelectedEdgeIds = this.selectedEdgeIds;

    this.selectedNodeIds = new Set(
      getNodesInside(
        this.store.nodeLookup,
        nextUserSelectRect,
        [this.store.viewport.x, this.store.viewport.y, this.store.viewport.zoom],
        this.store.selectionMode === SelectionMode.Partial,
        true,
      ).map((n) => n.id),
    );

    const edgesSelectable = this.store.defaultEdgeOptions.selectable ?? true;
    this.selectedEdgeIds = new Set();
    for (const nodeId of this.selectedNodeIds) {
      const connections = this.store.connectionLookup.get(nodeId);
      if (!connections) continue;
      for (const { edgeId } of connections.values()) {
        const edge = this.store.edgeLookup.get(edgeId);
        if (edge && (edge.selectable ?? edgesSelectable)) {
          this.selectedEdgeIds.add(edgeId);
        }
      }
    }

    if (!isSetEqual(prevSelectedNodeIds, this.selectedNodeIds)) {
      this.store.nodes = this.store.nodes.map(toggleSelected(this.selectedNodeIds));
    }
    if (!isSetEqual(prevSelectedEdgeIds, this.selectedEdgeIds)) {
      this.store.edges = this.store.edges.map(toggleSelected(this.selectedEdgeIds));
    }

    this.store.selectionRectMode = 'user';
    this.store.selectionRect = nextUserSelectRect;
  }

  private autoPan(): void {
    if (!this.autoPanOnSelection() || !this.containerBounds) return;
    const [x, y] = calcAutoPan(this.position, this.containerBounds, this.store.autoPanSpeed);
    this.store.panBy({ x, y }).then((panned) => {
      if (!this.selectionInProgress || !panned) {
        this.autoPanId = requestAnimationFrame(() => this.autoPan());
        return;
      }
      this.commitUserSelectionRect(this.position.x, this.position.y);
      this.autoPanId = requestAnimationFrame(() => this.autoPan());
    });
  }

  private cleanupAutoPan(): void {
    cancelAnimationFrame(this.autoPanId);
    this.autoPanId = 0;
    this.autoPanStarted = false;
  }

  private onPointerMove(event: PointerEvent) {
    if (!this.isSelectionEnabled()) return;
    if (!this.isSelecting() || !this.containerBounds || !this.store.selectionRect) return;

    const mousePos = getEventPosition(event, this.containerBounds);
    this.position = { x: mousePos.x, y: mousePos.y };

    const rect = this.store.selectionRect;
    const userStartPosition = { x: rect.startX, y: rect.startY };
    const screenStart = rendererPointToPoint(userStartPosition, [
      this.store.viewport.x,
      this.store.viewport.y,
      this.store.viewport.zoom,
    ]);

    if (!this.selectionInProgress) {
      const requiredDistance = this.store.selectionKeyPressed ? 0 : this.paneClickDistance();
      const distance = Math.hypot(mousePos.x - screenStart.x, mousePos.y - screenStart.y);
      if (distance <= requiredDistance) return;
      this.store.unselectNodesAndEdges();
    }

    this.selectionInProgress = true;

    if (!this.autoPanStarted) {
      this.autoPan();
      this.autoPanStarted = true;
    }

    this.commitUserSelectionRect(mousePos.x, mousePos.y);
  }

  private onPointerUp(event: PointerEvent) {
    if (!this.isSelectionEnabled()) {
      if (event.target === this.container && this.store.connection.inProgress) {
        this.connectionEndedOnPane = true;
      }
      return;
    }
    if (event.button !== 0) return;

    (event.target as Partial<Element>)?.releasePointerCapture?.(event.pointerId);

    if (!this.selectionInProgress && event.target === this.container) {
      this.onClick(event);
    }

    this.store.selectionRect = null;
    if (this.selectionInProgress) {
      this.store.selectionRectMode = this.selectedNodeIds.size > 0 ? 'nodes' : null;
    }
    this.cleanupAutoPan();
  }

  private onPointerCancel(event: PointerEvent) {
    (event.target as Partial<Element>)?.releasePointerCapture?.(event.pointerId);
    this.cleanupAutoPan();
  }

  private onContextMenu(event: MouseEvent) {
    if (event.target !== this.container) return;
    const panOnDragActive = this.panOnDragActive();
    if (Array.isArray(panOnDragActive) && panOnDragActive.includes(2)) {
      event.preventDefault();
      return;
    }
    this.store.flowProps.onpanecontextmenu?.({ event });
  }

  private onClickHandler(event: MouseEvent) {
    // capture-phase: swallow the click that ended a selection drag
    if (this.isSelectionEnabled() && this.selectionInProgress) {
      event.stopPropagation();
      this.selectionInProgress = false;
      return;
    }
    if (!this.isSelectionEnabled() && event.target === this.container) {
      this.onClick(event);
    }
  }

  private onClick(event: MouseEvent) {
    if (this.selectionInProgress || this.store.connection.inProgress || this.connectionEndedOnPane) {
      this.selectionInProgress = false;
      this.connectionEndedOnPane = false;
      return;
    }
    this.store.flowProps.onpaneclick?.({ event });
    this.store.unselectNodesAndEdges();
    this.store.selectionRectMode = null;
    this.store.selectionRect = null;
  }
}
