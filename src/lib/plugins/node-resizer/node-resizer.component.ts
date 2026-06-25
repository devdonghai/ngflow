import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  ResizeControlVariant,
  XY_RESIZER_HANDLE_POSITIONS,
  XY_RESIZER_LINE_POSITIONS,
  type OnResize,
  type OnResizeEnd,
  type OnResizeStart,
  type ResizeControlDirection,
  type ShouldResize,
} from '../../system';
import { ResizeControlComponent } from './resize-control.component';

/**
 * Convenience component that renders the full set of resize lines + handles
 * around a node. Angular port of Svelte Flow's `NodeResizer`. Drop it inside a
 * custom node (uses node id from context) or pass `nodeId`.
 *
 * @public
 */
@Component({
  selector: 'ng-flow-node-resizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResizeControlComponent],
  template: `
    @if (isVisible()) {
      @for (position of linePositions; track position) {
        <ng-flow-resize-control
          [class]="lineClass()"
          [nodeId]="nodeId()"
          [position]="position"
          [variant]="lineVariant"
          [color]="color()"
          [minWidth]="minWidth()"
          [minHeight]="minHeight()"
          [maxWidth]="maxWidth()"
          [maxHeight]="maxHeight()"
          [keepAspectRatio]="keepAspectRatio()"
          [resizeDirection]="resizeDirection()"
          [autoScale]="autoScale()"
          [shouldResize]="shouldResize()"
          [onResizeStart]="onResizeStart()"
          [onResize]="onResize()"
          [onResizeEnd]="onResizeEnd()"
        />
      }
      @for (position of handlePositions; track position) {
        <ng-flow-resize-control
          [class]="handleClass()"
          [nodeId]="nodeId()"
          [position]="position"
          [color]="color()"
          [minWidth]="minWidth()"
          [minHeight]="minHeight()"
          [maxWidth]="maxWidth()"
          [maxHeight]="maxHeight()"
          [keepAspectRatio]="keepAspectRatio()"
          [resizeDirection]="resizeDirection()"
          [autoScale]="autoScale()"
          [shouldResize]="shouldResize()"
          [onResizeStart]="onResizeStart()"
          [onResize]="onResize()"
          [onResizeEnd]="onResizeEnd()"
        />
      }
    }
  `,
})
export class NodeResizerComponent {
  readonly nodeId = input<string | undefined>(undefined);
  readonly isVisible = input<boolean>(true);
  readonly color = input<string | undefined>(undefined);
  readonly handleClass = input<string | undefined>(undefined);
  readonly lineClass = input<string | undefined>(undefined);
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

  protected readonly lineVariant = ResizeControlVariant.Line;
  protected readonly linePositions = XY_RESIZER_LINE_POSITIONS;
  protected readonly handlePositions = XY_RESIZER_HANDLE_POSITIONS;
}
