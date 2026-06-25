import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { injectFlowStore } from '../store/context';

/**
 * The transformed viewport layer. Angular port of Svelte Flow's `Viewport`.
 * Applies the pan/zoom transform; all node/edge layers live inside it.
 */
@Component({
  selector: 'ng-flow-viewport',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    class: 'ng-flow__viewport xyflow__viewport ng-flow__container',
    '[style.transform]': 'transform()',
  },
})
export class ViewportComponent {
  private readonly store = injectFlowStore();

  readonly transform = computed(() => {
    const v = this.store.viewport;
    return `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
  });
}
