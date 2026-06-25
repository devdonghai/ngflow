import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Position } from '../../system';
import { HandleComponent } from '../handle.component';

/** Output node: a single target handle and the label. */
@Component({
  selector: 'ng-flow-output-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HandleComponent],
  template: `
    {{ label() }}
    <ng-flow-handle type="target" [position]="targetPosition()" />
  `,
})
export class OutputNodeComponent {
  readonly data = input<Record<string, unknown> | undefined>({ label: 'Node' });
  readonly targetPosition = input<Position>(Position.Top);

  readonly label = computed(() => this.data()?.['label'] as string | undefined);
}
