import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EdgeLabelComponent } from './edge-label.component';

/**
 * The building block for all edges. Renders the visible edge `<path>`, an
 * invisible wider interaction `<path>`, and an optional label. Angular port of
 * Svelte Flow's `BaseEdge`.
 *
 * Applied as an attribute on an SVG `<g>` so it never introduces a non-SVG host
 * element into the SVG tree:
 *
 * ```html
 * <svg:g ngFlowBaseEdge [path]="path" ... />
 * ```
 */
@Component({
  selector: '[ngFlowBaseEdge]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeLabelComponent],
  template: `
    <svg:path
      [attr.id]="id()"
      [attr.d]="path()"
      [class]="pathClasses()"
      [attr.marker-start]="markerStart()"
      [attr.marker-end]="markerEnd()"
      fill="none"
      [style]="style()"
    />
    @if (interactionWidth() > 0) {
      <svg:path
        [attr.d]="path()"
        stroke-opacity="0"
        [attr.stroke-width]="interactionWidth()"
        fill="none"
        class="ng-flow__edge-interaction"
      />
    }
    @if (label()) {
      <ng-flow-edge-label
        [x]="labelX() ?? 0"
        [y]="labelY() ?? 0"
        [style]="labelStyle()"
        [selectEdgeOnClick]="true"
      >
        {{ label() }}
      </ng-flow-edge-label>
    }
  `,
})
export class BaseEdgeComponent {
  readonly id = input<string | undefined>(undefined);
  readonly path = input.required<string>();
  readonly label = input<string | undefined>(undefined);
  readonly labelX = input<number | undefined>(undefined);
  readonly labelY = input<number | undefined>(undefined);
  readonly labelStyle = input<string | undefined>(undefined);
  readonly markerStart = input<string | undefined>(undefined);
  readonly markerEnd = input<string | undefined>(undefined);
  readonly style = input<string | undefined>(undefined);
  readonly interactionWidth = input<number>(20);
  readonly className = input<string | undefined>(undefined, { alias: 'class' });

  readonly pathClasses = computed(() =>
    ['ng-flow__edge-path', this.className()].filter(Boolean).join(' '),
  );
}
