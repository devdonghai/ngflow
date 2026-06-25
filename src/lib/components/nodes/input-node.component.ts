import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Position } from '../../system';
import { HandleComponent } from '../handle.component';

/** Input node: the label and a single source handle. */
@Component({
  selector: 'ng-flow-input-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HandleComponent],
  template: `
    {{ label() }}
    <ng-flow-handle type="source" [position]="sourcePosition()" />
  `,
})
export class InputNodeComponent {
  readonly data = input<Record<string, unknown> | undefined>({ label: 'Node' });
  readonly sourcePosition = input<Position>(Position.Bottom);

  readonly label = computed(() => this.data()?.['label'] as string | undefined);
}
