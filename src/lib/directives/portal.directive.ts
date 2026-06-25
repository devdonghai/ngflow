import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

import { FLOW_STORE } from '../store/context';

export type PortalTarget = 'viewport-back' | 'viewport-front' | 'root' | 'edge-labels';

function tryToMount(node: Element, domNode: Element | null, target: PortalTarget | undefined) {
  if (!target || !domNode) {
    return;
  }

  const targetEl = target === 'root' ? domNode : domNode.querySelector(`.ng-flow__${target}`);

  if (targetEl) {
    targetEl.appendChild(node);
  }
}

/**
 * Angular port of Svelte Flow's `portal` action. Moves the host element into one
 * of the flow's well-known containers (e.g. `edge-labels`). Waits for the flow's
 * `domNode` to be available before mounting.
 */
@Directive({
  selector: '[ngflowPortal]',
  standalone: true,
})
export class PortalDirective implements OnDestroy {
  private readonly store = inject(FLOW_STORE);
  private readonly host = inject(ElementRef<Element>);

  readonly target = input<PortalTarget | undefined>(undefined, { alias: 'ngflowPortal' });

  private mounted = false;

  constructor() {
    effect(() => {
      const domNode = this.store.domNode;
      const target = this.target();
      if (!this.mounted && domNode) {
        tryToMount(this.host.nativeElement, domNode, target);
        this.mounted = true;
      } else if (this.mounted && domNode) {
        tryToMount(this.host.nativeElement, domNode, target);
      }
    });
  }

  ngOnDestroy(): void {
    const node = this.host.nativeElement;
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
}
