import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A single control button. Angular port of Svelte Flow's `ControlButton`.
 * Project the icon/label as content; bind `disabled`/`title` as usual.
 *
 * @public
 */
@Component({
  selector: 'ng-flow-control-button, button[ngFlowControlButton]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    '[class]': 'hostClasses()',
    '[style.--xy-controls-button-background-color-props]': 'bgColor()',
    '[style.--xy-controls-button-background-color-hover-props]': 'bgColorHover()',
    '[style.--xy-controls-button-color-props]': 'color()',
    '[style.--xy-controls-button-color-hover-props]': 'colorHover()',
    '[style.--xy-controls-button-border-color-props]': 'borderColor()',
  },
  template: `<ng-content />`,
})
export class ControlButtonComponent {
  readonly className = input<string | undefined>(undefined, { alias: 'class' });
  readonly bgColor = input<string | undefined>(undefined);
  readonly bgColorHover = input<string | undefined>(undefined);
  readonly color = input<string | undefined>(undefined);
  readonly colorHover = input<string | undefined>(undefined);
  readonly borderColor = input<string | undefined>(undefined);

  readonly hostClasses = computed(() =>
    ['ng-flow__controls-button', this.className()].filter(Boolean).join(' '),
  );
}
