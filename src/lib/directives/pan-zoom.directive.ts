import { Directive, ElementRef, OnDestroy, OnInit, effect, inject, input } from '@angular/core';

import {
  PanOnScrollMode,
  XYPanZoom,
  type CoordinateExtent,
  type OnPanZoom,
  type PanZoomInstance,
  type Transform,
  type Viewport,
} from '../system';

/**
 * Parameters consumed by the {@link PanZoomDirective}. Ported verbatim from the
 * Svelte `zoom` action params.
 */
export interface PanZoomDirectiveParams {
  viewport: Viewport;
  initialViewport: Viewport;
  minZoom: number;
  maxZoom: number;
  setPanZoomInstance: (panZoomInstance: PanZoomInstance) => void;
  onPanZoomStart?: OnPanZoom;
  onPanZoom?: OnPanZoom;
  onPanZoomEnd?: OnPanZoom;
  onPaneContextMenu?: (event: MouseEvent) => void;
  translateExtent: CoordinateExtent;
  zoomOnScroll: boolean;
  zoomOnPinch: boolean;
  zoomOnDoubleClick: boolean;
  panOnScroll: boolean;
  panOnDrag: boolean | number[];
  panOnScrollSpeed: number;
  panOnScrollMode: PanOnScrollMode;
  zoomActivationKeyPressed: boolean;
  preventScrolling: boolean;
  noPanClassName: string;
  noWheelClassName: string;
  userSelectionActive: boolean;
  lib: string;
  paneClickDistance: number;
  selectionOnDrag?: boolean;
  onTransformChange: (transform: Transform) => void;
  onDraggingChange: (dragging: boolean) => void;
  connectionInProgress: boolean;
}

/**
 * Angular port of Svelte Flow's `zoom` action. Sets up an {@link XYPanZoom}
 * instance on the host element and pushes parameter updates into it whenever the
 * bound {@link PanZoomDirectiveParams} object changes.
 */
@Directive({
  selector: '[ngflowPanZoom]',
  standalone: true,
})
export class PanZoomDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly params = input.required<PanZoomDirectiveParams>({ alias: 'ngflowPanZoom' });

  private panZoom: PanZoomInstance | null = null;

  constructor() {
    // Push every params change into the instance (mirrors the action's `update`).
    effect(() => {
      const params = this.params();
      if (this.panZoom) {
        this.panZoom.update(params);
      }
    });
  }

  ngOnInit(): void {
    const params = this.params();
    const {
      minZoom,
      maxZoom,
      initialViewport,
      onPanZoomStart,
      onPanZoom,
      onPanZoomEnd,
      translateExtent,
      setPanZoomInstance,
      onDraggingChange,
      onTransformChange,
    } = params;

    const panZoom = XYPanZoom({
      domNode: this.host.nativeElement,
      minZoom,
      maxZoom,
      translateExtent,
      viewport: initialViewport,
      onPanZoom,
      onPanZoomStart,
      onPanZoomEnd,
      onDraggingChange,
    });

    const viewport = panZoom.getViewport();
    if (
      initialViewport.x !== viewport.x ||
      initialViewport.y !== viewport.y ||
      initialViewport.zoom !== viewport.zoom
    ) {
      onTransformChange([viewport.x, viewport.y, viewport.zoom]);
    }

    setPanZoomInstance(panZoom);
    panZoom.update(params);
    this.panZoom = panZoom;
  }

  ngOnDestroy(): void {
    this.panZoom?.destroy();
  }
}
