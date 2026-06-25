import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
} from '@angular/core';

import {
  PanOnScrollMode,
  type OnPanZoom,
  type PanZoomInstance,
  type Transform,
  type Viewport,
} from '../system';
import { injectFlowStore } from '../store/context';
import { PanZoomDirective, type PanZoomDirectiveParams } from '../directives/pan-zoom.directive';

/**
 * The pan/zoom layer. Angular port of Svelte Flow's `Zoom`. Builds the reactive
 * {@link PanZoomDirectiveParams} from the store + inputs and hands them to the
 * {@link PanZoomDirective} applied to its container element.
 */
@Component({
  selector: 'ng-flow-zoom',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanZoomDirective],
  template: `
    <div class="ng-flow__zoom ng-flow__container" [ngflowPanZoom]="params()">
      <ng-content />
    </div>
  `,
})
export class ZoomComponent {
  private readonly store = injectFlowStore();

  readonly panOnScrollMode = input<PanOnScrollMode>(PanOnScrollMode.Free);
  readonly preventScrolling = input<boolean>(true);
  readonly zoomOnScroll = input<boolean>(true);
  readonly zoomOnDoubleClick = input<boolean>(true);
  readonly zoomOnPinch = input<boolean>(true);
  readonly panOnScroll = input<boolean>(false);
  readonly panOnScrollSpeed = input<number>(0.5);
  readonly panOnDrag = input<boolean | number[]>(true);
  readonly paneClickDistance = input<number>(1);
  readonly selectionOnDrag = input<boolean>(false);
  readonly onmovestart = input<OnPanZoom | undefined>(undefined);
  readonly onmove = input<OnPanZoom | undefined>(undefined);
  readonly onmoveend = input<OnPanZoom | undefined>(undefined);
  readonly oninit = input<(() => void) | undefined>(undefined);

  /** Captured once, mirroring Svelte's `const { viewport: initialViewport } = store`. */
  private readonly initialViewport: Viewport = this.store.viewport;

  readonly params = computed<PanZoomDirectiveParams>(() => {
    const panOnDragActive = this.store.panActivationKeyPressed || this.panOnDrag();
    const panOnScrollActive = this.store.panActivationKeyPressed || this.panOnScroll();

    return {
      viewport: this.store.viewport,
      minZoom: this.store.minZoom,
      maxZoom: this.store.maxZoom,
      initialViewport: this.initialViewport,
      onDraggingChange: (dragging: boolean) => {
        this.store.dragging = dragging;
      },
      setPanZoomInstance: (instance: PanZoomInstance) => {
        this.store.panZoom = instance;
      },
      onPanZoomStart: this.onmovestart(),
      onPanZoom: this.onmove(),
      onPanZoomEnd: this.onmoveend(),
      zoomOnScroll: this.zoomOnScroll(),
      zoomOnDoubleClick: this.zoomOnDoubleClick(),
      zoomOnPinch: this.zoomOnPinch(),
      panOnScroll: panOnScrollActive,
      panOnDrag: panOnDragActive,
      panOnScrollSpeed: this.panOnScrollSpeed(),
      panOnScrollMode: this.panOnScrollMode(),
      zoomActivationKeyPressed: this.store.zoomActivationKeyPressed,
      preventScrolling:
        typeof this.preventScrolling() === 'boolean' ? this.preventScrolling() : true,
      noPanClassName: this.store.noPanClass,
      noWheelClassName: this.store.noWheelClass,
      userSelectionActive: !!this.store.selectionRect,
      translateExtent: this.store.translateExtent,
      lib: 'angular',
      paneClickDistance: this.paneClickDistance(),
      selectionOnDrag: this.selectionOnDrag(),
      onTransformChange: (transform: Transform) => {
        this.store.viewport = { x: transform[0], y: transform[1], zoom: transform[2] };
      },
      connectionInProgress: this.store.connection.inProgress,
    };
  });

  constructor() {
    let onInitCalled = false;
    effect(() => {
      if (!onInitCalled && this.store.viewportInitialized) {
        this.oninit()?.();
        onInitCalled = true;
      }
    });
  }
}
