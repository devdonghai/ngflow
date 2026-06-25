import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import {
  XYMinimap,
  getBoundsOfRects,
  getInternalNodesBounds,
  getNodeDimensions,
  nodeHasDimensions,
  type PanelPosition,
} from '../../system';
import type { Node } from '../../types';
import { PanelComponent } from '../../container/panel.component';
import { injectStore } from '../../hooks/inject-store';

/** A function deriving a minimap attribute (color/class) from a node. */
export type GetMiniMapNodeAttribute = (node: Node) => string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAttrFunction = (func: any): GetMiniMapNodeAttribute =>
  func instanceof Function ? func : () => func;

interface MinimapNodeView {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  color: string | undefined;
  strokeColor: string;
  className: string;
}

/**
 * An overview minimap of the flow with pannable/zoomable viewport. Angular port
 * of Svelte Flow's `MiniMap`. (Custom `nodeComponent` rendering is not yet
 * supported; built-in rect nodes are used.)
 *
 * @public
 */
@Component({
  selector: 'ng-flow-minimap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent],
  host: { style: 'display: contents' },
  template: `
    <ng-flow-panel
      [position]="position()"
      [class]="panelClasses()"
      [style]="style()"
      [style.--xy-minimap-background-color-props]="bgColor()"
    >
      @if (store.panZoom) {
        <svg
          #svg
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="viewBox()"
          class="ng-flow__minimap-svg"
          role="img"
          [attr.aria-labelledby]="labelledBy()"
          [style.--xy-minimap-mask-background-color-props]="maskColor()"
          [style.--xy-minimap-mask-stroke-color-props]="maskStrokeColor()"
          [style.--xy-minimap-mask-stroke-width-props]="maskStrokeWidthScaled()"
        >
          @if (label()) {
            <title [attr.id]="labelledBy()">{{ label() }}</title>
          }

          @for (n of nodeViews(); track n.id) {
            <rect
              [class]="n.className"
              [class.selected]="n.selected"
              [attr.x]="n.x"
              [attr.y]="n.y"
              [attr.rx]="nodeBorderRadius()"
              [attr.ry]="nodeBorderRadius()"
              [attr.width]="n.width"
              [attr.height]="n.height"
              [style.fill]="n.color"
              [style.stroke]="n.strokeColor"
              [style.stroke-width]="nodeStrokeWidth()"
              [attr.shape-rendering]="shapeRendering"
            />
          }

          <path
            class="ng-flow__minimap-mask"
            [attr.d]="maskPath()"
            fill-rule="evenodd"
            pointer-events="none"
          />
        </svg>
      }
    </ng-flow-panel>
  `,
})
export class MiniMapComponent {
  readonly store = injectStore();
  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');

  readonly position = input<PanelPosition>('bottom-right');
  readonly ariaLabel = input<string | null | undefined>(undefined);
  readonly nodeStrokeColor = input<string | GetMiniMapNodeAttribute>('transparent');
  readonly nodeColor = input<string | GetMiniMapNodeAttribute | undefined>(undefined);
  readonly nodeClass = input<string | GetMiniMapNodeAttribute>('');
  readonly nodeBorderRadius = input<number>(5);
  readonly nodeStrokeWidth = input<number>(2);
  readonly bgColor = input<string | undefined>(undefined);
  readonly maskColor = input<string | undefined>(undefined);
  readonly maskStrokeColor = input<string | undefined>(undefined);
  readonly maskStrokeWidth = input<number | undefined>(undefined);
  readonly width = input<number>(200);
  readonly height = input<number>(150);
  readonly pannable = input<boolean>(true);
  readonly zoomable = input<boolean>(true);
  readonly inversePan = input<boolean | undefined>(undefined);
  readonly zoomStep = input<number | undefined>(undefined);
  readonly className = input<string | undefined>(undefined, { alias: 'class' });
  readonly style = input<string | undefined>(undefined);

  readonly shapeRendering =
    typeof window === 'undefined' || // SSR
    // @ts-expect-error - chrome is not on the Window type
    !!window.chrome
      ? 'crispEdges'
      : 'geometricPrecision';

  readonly labelledBy = computed(() => `ng-flow__minimap-desc-${this.store.flowId}`);

  readonly label = computed(
    () => this.ariaLabel() ?? this.store.ariaLabelConfig['minimap.ariaLabel'],
  );

  private readonly viewBB = computed(() => {
    const { x, y, zoom } = this.store.viewport;
    return {
      x: -x / zoom,
      y: -y / zoom,
      width: this.store.width / zoom,
      height: this.store.height / zoom,
    };
  });

  private readonly boundingRect = computed(() =>
    getBoundsOfRects(
      getInternalNodesBounds(this.store.nodeLookup, { filter: (n) => !n.hidden }),
      this.viewBB(),
    ),
  );

  private readonly viewScale = computed(() => {
    const rect = this.boundingRect();
    return Math.max(rect.width / this.width(), rect.height / this.height());
  });

  private readonly geometry = computed(() => {
    const rect = this.boundingRect();
    const scale = this.viewScale();
    const viewWidth = scale * this.width();
    const viewHeight = scale * this.height();
    const offset = 5 * scale;
    const x = rect.x - (viewWidth - rect.width) / 2 - offset;
    const y = rect.y - (viewHeight - rect.height) / 2 - offset;
    const viewboxWidth = viewWidth + offset * 2;
    const viewboxHeight = viewHeight + offset * 2;
    return { x, y, offset, viewboxWidth, viewboxHeight };
  });

  readonly viewBox = computed(() => {
    const g = this.geometry();
    return `${g.x} ${g.y} ${g.viewboxWidth} ${g.viewboxHeight}`;
  });

  readonly maskStrokeWidthScaled = computed(() => {
    const w = this.maskStrokeWidth();
    return w ? w * this.viewScale() : undefined;
  });

  readonly maskPath = computed(() => {
    const g = this.geometry();
    const bb = this.viewBB();
    return (
      `M${g.x - g.offset},${g.y - g.offset}` +
      `h${g.viewboxWidth + g.offset * 2}v${g.viewboxHeight + g.offset * 2}` +
      `h${-g.viewboxWidth - g.offset * 2}z ` +
      `M${bb.x},${bb.y}h${bb.width}v${bb.height}h${-bb.width}z`
    );
  });

  readonly panelClasses = computed(() =>
    ['ng-flow__minimap', this.className()].filter(Boolean).join(' '),
  );

  readonly nodeViews = computed<MinimapNodeView[]>(() => {
    const colorFn = this.nodeColor() === undefined ? undefined : getAttrFunction(this.nodeColor());
    const strokeFn = getAttrFunction(this.nodeStrokeColor());
    const classFn = getAttrFunction(this.nodeClass());

    const views: MinimapNodeView[] = [];
    for (const userNode of this.store.nodes) {
      const node = this.store.nodeLookup.get(userNode.id);
      if (!node || !nodeHasDimensions(node) || node.hidden) {
        continue;
      }
      const { width, height } = getNodeDimensions(node);
      views.push({
        id: node.id,
        x: node.internals.positionAbsolute.x,
        y: node.internals.positionAbsolute.y,
        width,
        height,
        selected: !!node.selected,
        color: colorFn ? colorFn(userNode) : undefined,
        strokeColor: strokeFn(userNode),
        className: ['ng-flow__minimap-node', classFn(userNode)].filter(Boolean).join(' '),
      });
    }
    return views;
  });

  constructor() {
    let minimap: ReturnType<typeof XYMinimap> | null = null;

    // Create the XYMinimap once the svg + panZoom exist, then push config
    // updates on every dependency change (the `update` call is idempotent).
    effect(() => {
      const svgEl = this.svg()?.nativeElement;
      const panZoom = this.store.panZoom;
      if (!svgEl || !panZoom) {
        return;
      }

      if (!minimap) {
        minimap = XYMinimap({
          domNode: svgEl,
          panZoom,
          getTransform: () => {
            const { x, y, zoom } = this.store.viewport;
            return [x, y, zoom];
          },
          getViewScale: () => this.viewScale(),
        });
      }

      minimap.update({
        translateExtent: this.store.translateExtent,
        width: this.store.width,
        height: this.store.height,
        inversePan: this.inversePan(),
        zoomStep: this.zoomStep(),
        pannable: this.pannable(),
        zoomable: this.zoomable(),
      });
    });

    inject(DestroyRef).onDestroy(() => minimap?.destroy());
  }
}
