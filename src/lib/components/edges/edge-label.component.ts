import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { FLOW_STORE, EDGE_ID } from '../../store/context';
import { PortalDirective } from '../../directives/portal.directive';
import { toPxString } from '../../utils';

/**
 * A label rendered in the HTML `edge-labels` overlay layer. Angular port of
 * Svelte Flow's `EdgeLabel`. Uses {@link PortalDirective} to move itself out of
 * the SVG tree into the overlay container.
 */
@Component({
  selector: 'ng-flow-edge-label',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [{ directive: PortalDirective, inputs: ['ngflowPortal'] }],
  template: `<ng-content />`,
  host: {
    ngflowPortal: 'edge-labels',
    '[class]': 'hostClasses()',
    '[style.cursor]': "selectEdgeOnClick() ? 'pointer' : null",
    '[style.transform]': 'transform()',
    '[style.pointer-events]': '"all"',
    '[style.width]': 'widthPx()',
    '[style.height]': 'heightPx()',
    '[style.z-index]': 'z()',
    '[attr.tabindex]': '-1',
    '(click)': 'onClick()',
  },
})
export class EdgeLabelComponent {
  private readonly store = inject(FLOW_STORE);
  private readonly injectedEdgeId = inject(EDGE_ID, { optional: true }) ?? '';

  /** Explicit edge id; falls back to the injected {@link EDGE_ID} context. */
  readonly edgeIdInput = input<string | undefined>(undefined, { alias: 'edgeId' });
  private readonly edgeId = computed(() => this.edgeIdInput() ?? this.injectedEdgeId);

  readonly x = input<number>(0);
  readonly y = input<number>(0);
  readonly width = input<number | undefined>(undefined);
  readonly height = input<number | undefined>(undefined);
  readonly selectEdgeOnClick = input<boolean>(false);
  readonly transparent = input<boolean>(false);
  readonly className = input<string | undefined>(undefined, { alias: 'class' });

  readonly transform = computed(
    () => `translate(-50%, -50%) translate(${this.x()}px,${this.y()}px)`,
  );
  readonly widthPx = computed(() => toPxString(this.width()) ?? null);
  readonly heightPx = computed(() => toPxString(this.height()) ?? null);
  readonly z = computed(() => this.store.visible.edges.get(this.edgeId())?.zIndex ?? null);

  readonly hostClasses = computed(() =>
    ['ng-flow__edge-label', this.transparent() ? 'transparent' : '', this.className()]
      .filter(Boolean)
      .join(' '),
  );

  onClick(): void {
    const edgeId = this.edgeId();
    if (this.selectEdgeOnClick() && edgeId) {
      this.store.handleEdgeSelection(edgeId);
    }
  }
}
