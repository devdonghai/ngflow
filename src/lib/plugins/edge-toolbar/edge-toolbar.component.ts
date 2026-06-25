import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { getEdgeToolbarTransform } from '../../system';
import { EdgeLabelComponent } from '../../components/edges/edge-label.component';
import { injectEdgeId } from '../../store/context';
import { injectStore } from '../../hooks/inject-store';

/**
 * A toolbar that floats next to an edge. Angular port of Svelte Flow's
 * `EdgeToolbar`. Must be used within an edge (reads the edge id from context).
 * Project the toolbar content as children.
 *
 * @public
 */
@Component({
  selector: 'ng-flow-edge-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeLabelComponent],
  host: { style: 'display: contents' },
  template: `
    @if (isActive()) {
      <ng-flow-edge-label [selectEdgeOnClick]="selectEdgeOnClick()" [transparent]="true">
        <div
          style="position: absolute; transform-origin: 0 0"
          [style.transform]="transform()"
          [class]="classes()"
          [attr.data-id]="edgeId"
        >
          <ng-content />
        </div>
      </ng-flow-edge-label>
    }
  `,
})
export class EdgeToolbarComponent {
  private readonly store = injectStore();
  readonly edgeId = injectEdgeId();

  readonly x = input<number>(0);
  readonly y = input<number>(0);
  readonly alignX = input<'left' | 'center' | 'right'>('center');
  readonly alignY = input<'top' | 'center' | 'bottom'>('center');
  readonly isVisible = input<boolean | undefined>(undefined);
  readonly selectEdgeOnClick = input<boolean>(false);
  readonly className = input<string | undefined>(undefined, { alias: 'class' });

  constructor() {
    if (!this.edgeId) {
      throw new Error('EdgeToolbar must be used within an edge');
    }
  }

  readonly isActive = computed(() => {
    const visible = this.isVisible();
    return typeof visible === 'boolean'
      ? visible
      : (this.store.edgeLookup.get(this.edgeId!)?.selected ?? false);
  });

  readonly transform = computed(() =>
    getEdgeToolbarTransform(this.x(), this.y(), this.store.viewport.zoom, this.alignX(), this.alignY()),
  );

  readonly classes = computed(() =>
    ['ng-flow__edge-toolbar', this.className()].filter(Boolean).join(' '),
  );
}
