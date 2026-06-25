import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Position } from '../../system';
import { HandleComponent } from '../handle.component';

/** Default node: a target handle, the label, and a source handle. */
@Component({
  selector: 'ng-flow-default-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HandleComponent],
  template: `
    <ng-flow-handle type="target" [position]="targetPosition()" />
    {{ label() }}
    <ng-flow-handle type="source" [position]="sourcePosition()" />
  `,
})
export class DefaultNodeComponent {
  readonly data = input<Record<string, unknown> | undefined>(undefined);
  readonly targetPosition = input<Position>(Position.Top);
  readonly sourcePosition = input<Position>(Position.Bottom);

  readonly label = computed(() => this.data()?.['label'] as string | undefined);
}
