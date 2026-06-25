import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PanelPosition, ProOptions } from '../system';
import { PanelComponent } from './panel.component';

/**
 * The "NgFlow" attribution shown in a corner of the flow. Angular port of Svelte
 * Flow's `Attribution`. Hidden when `proOptions.hideAttribution` is set.
 */
@Component({
  selector: 'ng-flow-attribution',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent],
  template: `
    @if (!proOptions()?.hideAttribution) {
      <ng-flow-panel
        [position]="position()"
        class="ng-flow__attribution"
        [attr.data-message]="dataMessage"
      >
        <a [href]="link" target="_blank" rel="noopener noreferrer" aria-label="NgFlow attribution">
          NgFlow
        </a>
      </ng-flow-panel>
    }
  `,
})
export class AttributionComponent {
  readonly proOptions = input<ProOptions | undefined>(undefined);
  readonly position = input<PanelPosition>('bottom-right');

  readonly link = 'https://xyflow.com';
  readonly dataMessage = `Please only hide this attribution when you are subscribed to xyflow Pro: ${this.link}`;
}
