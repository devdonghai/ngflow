import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
} from '@angular/core';

import { injectFlowStore } from '../store/context';
import type { Edge, InternalNode, Node } from '../types';
import { NodeWrapperComponent } from '../components/node-wrapper.component';

/**
 * Renders all visible nodes. Angular port of Svelte Flow's `NodeRenderer`. Owns
 * the shared {@link ResizeObserver} that measures node elements and feeds
 * dimensions back into the store via `updateNodeInternals`.
 */
@Component({
  selector: 'ng-flow-node-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NodeWrapperComponent],
  template: `
    <div class="ng-flow__nodes">
      @for (node of nodes(); track node.id) {
        <ng-flow-node-wrapper
          [node]="node"
          [resizeObserver]="resizeObserver"
          [nodeClickDistance]="nodeClickDistance()"
        />
      }
    </div>
  `,
})
export class NodeRendererComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge>
  implements OnDestroy
{
  private readonly store = injectFlowStore<NodeType, EdgeType>();

  readonly nodeClickDistance = input<number | undefined>(undefined);

  readonly nodes = computed<InternalNode<NodeType>[]>(() =>
    Array.from(this.store.visible.nodes.values()),
  );

  readonly resizeObserver: ResizeObserver | null =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const updates = new Map();
          entries.forEach((entry) => {
            const id = entry.target.getAttribute('data-id') as string;
            updates.set(id, { id, nodeElement: entry.target as HTMLDivElement, force: true });
          });
          this.store.updateNodeInternals(updates);
        });

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
