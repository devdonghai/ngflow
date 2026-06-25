import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { MarkerType } from '../system';
import { injectFlowStore } from '../store/context';
import type { Edge, EdgeLayouted, Node } from '../types';
import { EdgeWrapperComponent } from '../components/edge-wrapper.component';

/**
 * Renders all visible edges plus the shared arrowhead marker `<defs>`. Angular
 * port of Svelte Flow's `EdgeRenderer` (with `MarkerDefinition`/`Marker` inlined
 * to keep everything inside a single SVG namespace).
 */
@Component({
  selector: 'ng-flow-edge-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeWrapperComponent],
  template: `
    <div class="ng-flow__edges">
      <svg class="ng-flow__marker">
        <svg:defs>
          @for (marker of markers(); track marker.id) {
            <svg:marker
              class="ng-flow__arrowhead"
              [attr.id]="marker.id"
              [attr.markerWidth]="marker.width ?? 12.5"
              [attr.markerHeight]="marker.height ?? 12.5"
              viewBox="-10 -10 20 20"
              [attr.markerUnits]="marker.markerUnits ?? 'strokeWidth'"
              [attr.orient]="marker.orient ?? 'auto-start-reverse'"
              refX="0"
              refY="0"
            >
              @if (marker.type === MarkerType.Arrow) {
                <svg:polyline
                  class="arrow"
                  [style.stroke]="marker.color ?? 'none'"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  [attr.stroke-width]="marker.strokeWidth"
                  points="-5,-4 0,0 -5,4"
                />
              } @else if (marker.type === MarkerType.ArrowClosed) {
                <svg:polyline
                  class="arrowclosed"
                  [style.stroke]="marker.color ?? 'none'"
                  [style.fill]="marker.color ?? 'none'"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  [attr.stroke-width]="marker.strokeWidth"
                  points="-5,-4 0,0 -5,4 -5,-4"
                />
              }
            </svg:marker>
          }
        </svg:defs>
      </svg>

      @for (edge of edges(); track edge.id) {
        <ng-flow-edge-wrapper [edge]="edge" />
      }
    </div>
  `,
})
export class EdgeRendererComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  private readonly store = injectFlowStore<NodeType, EdgeType>();
  protected readonly MarkerType = MarkerType;

  readonly markers = computed(() => this.store.markers);
  readonly edges = computed<EdgeLayouted<EdgeType>[]>(() =>
    Array.from(this.store.visible.edges.values()),
  );
}
