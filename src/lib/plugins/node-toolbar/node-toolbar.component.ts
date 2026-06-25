import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Position, getNodeToolbarTransform, type Align } from '../../system';
import type { InternalNode } from '../../types';
import { PortalDirective } from '../../directives/portal.directive';
import { injectNodeId } from '../../store/context';
import { injectStore } from '../../hooks/inject-store';
import { injectFlow } from '../../hooks/inject-flow';

/**
 * A toolbar that floats next to one or more nodes. Angular port of Svelte Flow's
 * `NodeToolbar`. Place inside a custom node (uses the node id from context) or
 * pass `nodeId` explicitly. Project the toolbar content as children.
 *
 * @public
 */
@Component({
  selector: 'ng-flow-node-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PortalDirective],
  host: { style: 'display: contents' },
  template: `
    @if (store.domNode && isActive()) {
      <div
        [ngflowPortal]="'root'"
        class="ng-flow__node-toolbar"
        [attr.data-id]="dataId()"
        style="position: absolute"
        [style.transform]="transform()"
        [style.z-index]="zIndex()"
      >
        <ng-content />
      </div>
    }
  `,
})
export class NodeToolbarComponent {
  readonly store = injectStore();
  private readonly flow = injectFlow();
  private readonly contextNodeId = injectNodeId();

  readonly nodeId = input<string | string[] | undefined>(undefined);
  readonly position = input<Position>(Position.Top);
  readonly align = input<Align>('center');
  readonly offset = input<number>(10);
  readonly isVisible = input<boolean | undefined>(undefined);

  readonly toolbarNodes = computed<InternalNode[]>(() => {
    // Subscribe to node changes.
    this.store.nodes;

    const id = this.nodeId();
    const nodeIds = Array.isArray(id) ? id : [id ?? this.contextNodeId];

    return nodeIds.reduce<InternalNode[]>((res, nid) => {
      if (!nid) {
        throw new Error('Either pass a nodeId or use within a Custom Node component');
      }
      const node = this.store.nodeLookup.get(nid);
      if (node) {
        res.push(node);
      }
      return res;
    }, []);
  });

  readonly transform = computed(() => {
    const nodes = this.toolbarNodes();
    const nodeRect = this.flow.getNodesBounds(nodes);
    return nodeRect
      ? getNodeToolbarTransform(nodeRect, this.store.viewport, this.position(), this.offset(), this.align())
      : '';
  });

  readonly zIndex = computed(() => {
    const nodes = this.toolbarNodes();
    return nodes.length === 0
      ? 1
      : Math.max(...nodes.map((node) => (node.internals.z || 5) + 1));
  });

  private readonly selectedNodesCount = computed(
    () => this.store.nodes.filter((node) => node.selected).length,
  );

  readonly isActive = computed(() => {
    const visible = this.isVisible();
    if (typeof visible === 'boolean') {
      return visible;
    }
    const nodes = this.toolbarNodes();
    return nodes.length === 1 && nodes[0].selected && this.selectedNodesCount() === 1;
  });

  readonly dataId = computed(() =>
    this.toolbarNodes()
      .reduce((acc, node) => `${acc}${node.id} `, '')
      .trim(),
  );
}
