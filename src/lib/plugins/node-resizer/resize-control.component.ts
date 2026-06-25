import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';

import {
  ResizeControlVariant,
  XYResizer,
  type ControlPosition,
  type OnResize,
  type OnResizeEnd,
  type OnResizeStart,
  type ResizeControlDirection,
  type ShouldResize,
  type XYResizerChange,
  type XYResizerChildChange,
  type XYResizerInstance,
} from '../../system';
import { injectNodeId } from '../../store/context';
import { injectStore } from '../../hooks/inject-store';

/**
 * A single resize handle or line. Angular port of Svelte Flow's
 * `NodeResizeControl`. Place inside a custom node (uses node id from context) or
 * pass `nodeId`. Project optional content as children.
 *
 * @public
 */
@Component({
  selector: 'ng-flow-resize-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[style.border-color]': 'isLineVariant() ? color() : null',
    '[style.background-color]': 'isLineVariant() ? null : color()',
    '[style.scale]': 'scale()',
  },
  template: `<ng-content />`,
})
export class ResizeControlComponent {
  private readonly store = injectStore();
  private readonly contextNodeId = injectNodeId();
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  readonly nodeId = input<string | undefined>(undefined);
  readonly position = input<ControlPosition | undefined>(undefined);
  readonly variant = input<ResizeControlVariant>(ResizeControlVariant.Handle);
  readonly color = input<string | undefined>(undefined);
  readonly minWidth = input<number>(10);
  readonly minHeight = input<number>(10);
  readonly maxWidth = input<number>(Number.MAX_VALUE);
  readonly maxHeight = input<number>(Number.MAX_VALUE);
  readonly keepAspectRatio = input<boolean>(false);
  readonly resizeDirection = input<ResizeControlDirection | undefined>(undefined);
  readonly autoScale = input<boolean>(true);
  readonly shouldResize = input<ShouldResize | undefined>(undefined);
  readonly onResizeStart = input<OnResizeStart | undefined>(undefined);
  readonly onResize = input<OnResize | undefined>(undefined);
  readonly onResizeEnd = input<OnResizeEnd | undefined>(undefined);
  readonly className = input<string | undefined>(undefined, { alias: 'class' });

  private readonly id = computed(() => {
    const id = this.nodeId() ?? this.contextNodeId;
    if (!id) {
      throw new Error('Either pass a nodeId or use within a Custom Node component');
    }
    return id;
  });

  readonly isLineVariant = computed(() => this.variant() === ResizeControlVariant.Line);

  private readonly controlPosition = computed<ControlPosition>(
    () => this.position() ?? ((this.isLineVariant() ? 'right' : 'bottom-right') as ControlPosition),
  );

  readonly scale = computed(() =>
    this.isLineVariant() || !this.autoScale()
      ? null
      : Math.max(1 / this.store.viewport.zoom, 1),
  );

  readonly hostClasses = computed(() =>
    [
      'ng-flow__resize-control',
      this.store.noDragClass,
      ...this.controlPosition().split('-'),
      this.variant(),
      this.className(),
    ]
      .filter(Boolean)
      .join(' '),
  );

  private resizer: XYResizerInstance | null = null;

  constructor() {
    afterNextRender(() => {
      const id = this.id();
      this.resizer = XYResizer({
        domNode: this.host.nativeElement,
        nodeId: id,
        getStoreItems: () => ({
          nodeLookup: this.store.nodeLookup,
          transform: [this.store.viewport.x, this.store.viewport.y, this.store.viewport.zoom],
          snapGrid: this.store.snapGrid ?? undefined,
          snapToGrid: !!this.store.snapGrid,
          nodeOrigin: this.store.nodeOrigin,
          paneDomNode: this.store.domNode as HTMLDivElement | null,
        }),
        onChange: (change: XYResizerChange, childChanges: XYResizerChildChange[]) => {
          const changes = new Map<string, XYResizerChange>();
          changes.set(id, change);
          for (const childChange of childChanges) {
            changes.set(childChange.id, {
              x: childChange.position.x,
              y: childChange.position.y,
            });
          }

          const direction = this.resizeDirection();
          const horizontal = !direction || direction === 'horizontal';
          const vertical = !direction || direction === 'vertical';

          this.store.nodes = this.store.nodes.map((node) => {
            const c = changes.get(node.id);
            if (c) {
              return {
                ...node,
                position: {
                  x: horizontal ? (c.x ?? node.position.x) : node.position.x,
                  y: vertical ? (c.y ?? node.position.y) : node.position.y,
                },
                width: horizontal ? (c.width ?? node.width) : node.width,
                height: vertical ? (c.height ?? node.height) : node.height,
              };
            }
            return node;
          });
        },
      });

      // Push the (reactive) control config to the resizer.
      effect(
        () => {
          this.resizer?.update({
            controlPosition: this.controlPosition(),
            boundaries: {
              minWidth: this.minWidth(),
              minHeight: this.minHeight(),
              maxWidth: this.maxWidth(),
              maxHeight: this.maxHeight(),
            },
            keepAspectRatio: this.keepAspectRatio(),
            resizeDirection: this.resizeDirection(),
            onResizeStart: this.onResizeStart(),
            onResize: this.onResize(),
            onResizeEnd: this.onResizeEnd(),
            shouldResize: this.shouldResize(),
          });
        },
        { injector: this.injector },
      );
    });

    inject(DestroyRef).onDestroy(() => this.resizer?.destroy());
  }
}
