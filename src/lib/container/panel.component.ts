import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PanelPosition } from '../system';

/**
 * A positioned overlay anchored to one of the flow's corners. Angular port of
 * Svelte Flow's `Panel`, used by plugins (Controls, MiniMap, Attribution, …).
 */
@Component({
  selector: 'ng-flow-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[class]': 'hostClasses()',
    '[style]': 'style()',
  },
})
export class PanelComponent {
  readonly position = input<PanelPosition>('top-right');
  readonly className = input<string | undefined>(undefined, { alias: 'class' });
  readonly style = input<string | undefined>(undefined);

  readonly hostClasses = computed(() =>
    ['ng-flow__panel', this.className(), ...`${this.position()}`.split('-')]
      .filter(Boolean)
      .join(' '),
  );
}
