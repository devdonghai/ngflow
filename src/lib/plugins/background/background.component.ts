import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { injectStore } from '../../hooks/inject-store';

/**
 * The background pattern variant. Angular port of Svelte Flow's
 * `BackgroundVariant`.
 *
 * @public
 */
export enum BackgroundVariant {
  Lines = 'lines',
  Dots = 'dots',
  Cross = 'cross',
}

const defaultSize: Record<BackgroundVariant, number> = {
  [BackgroundVariant.Dots]: 1,
  [BackgroundVariant.Lines]: 1,
  [BackgroundVariant.Cross]: 6,
};

/**
 * Renders a pannable/zoomable background pattern (dots, lines or crosses).
 * Angular port of Svelte Flow's `Background`. Place it inside `<ng-flow>`.
 *
 * @public
 */
@Component({
  selector: 'ng-flow-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <svg
      [class]="hostClasses()"
      data-testid="ng-flow__background"
      [style.--xy-background-color-props]="bgColor()"
      [style.--xy-background-pattern-color-props]="patternColor()"
    >
      <pattern
        [attr.id]="patternId()"
        [attr.x]="store.viewport.x % scaledGap()[0]"
        [attr.y]="store.viewport.y % scaledGap()[1]"
        [attr.width]="scaledGap()[0]"
        [attr.height]="scaledGap()[1]"
        patternUnits="userSpaceOnUse"
        [attr.patternTransform]="
          'translate(-' + patternOffset()[0] + ',-' + patternOffset()[1] + ')'
        "
      >
        @if (isDots()) {
          <circle
            [attr.cx]="scaledSize() / 2"
            [attr.cy]="scaledSize() / 2"
            [attr.r]="scaledSize() / 2"
            [class]="patternClasses('dots')"
          />
        } @else {
          <path
            [attr.stroke-width]="lineWidth()"
            [attr.d]="linePath()"
            [class]="patternClasses(variant())"
          />
        }
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" [attr.fill]="'url(#' + patternId() + ')'" />
    </svg>
  `,
})
export class BackgroundComponent {
  readonly store = injectStore();

  readonly id = input<string | undefined>(undefined);
  readonly variant = input<BackgroundVariant>(BackgroundVariant.Dots);
  readonly gap = input<number | [number, number]>(20);
  readonly size = input<number | undefined>(undefined);
  readonly lineWidth = input<number>(1);
  readonly bgColor = input<string | undefined>(undefined);
  readonly patternColor = input<string | undefined>(undefined);
  readonly patternClass = input<string | undefined>(undefined);
  readonly className = input<string | undefined>(undefined, { alias: 'class' });

  readonly isDots = computed(() => this.variant() === BackgroundVariant.Dots);
  readonly isCross = computed(() => this.variant() === BackgroundVariant.Cross);

  private readonly gapXY = computed<[number, number]>(() => {
    const gap = this.gap();
    return Array.isArray(gap) ? gap : [gap, gap];
  });

  readonly patternId = computed(() => `background-pattern-${this.store.flowId}-${this.id() ?? ''}`);

  readonly scaledGap = computed<[number, number]>(() => {
    const zoom = this.store.viewport.zoom;
    const [gx, gy] = this.gapXY();
    return [gx * zoom || 1, gy * zoom || 1];
  });

  readonly scaledSize = computed(
    () => (this.size() ?? defaultSize[this.variant()]) * this.store.viewport.zoom,
  );

  readonly patternDimensions = computed<[number, number]>(() => {
    const s = this.scaledSize();
    return this.isCross() ? [s, s] : this.scaledGap();
  });

  readonly patternOffset = computed<[number, number]>(() => {
    const dims = this.patternDimensions();
    return this.isDots()
      ? [this.scaledSize() / 2, this.scaledSize() / 2]
      : [dims[0] / 2, dims[1] / 2];
  });

  readonly linePath = computed(() => {
    const [w, h] = this.patternDimensions();
    return `M${w / 2} 0 V${h} M0 ${h / 2} H${w}`;
  });

  readonly hostClasses = computed(() =>
    ['ng-flow__background', 'ng-flow__container', this.className()].filter(Boolean).join(' '),
  );

  patternClasses(variant: string): string {
    return ['ng-flow__background-pattern', variant, this.patternClass()].filter(Boolean).join(' ');
  }
}
