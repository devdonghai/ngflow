import type { InternalNodeUpdate } from '../system';
import { injectNodeId } from '../store/context';
import { injectStore } from './inject-store';

/**
 * When you programmatically add/remove handles or change a handle's position you
 * must tell NgFlow so it remeasures the node and repositions handles. Angular
 * port of Svelte Flow's `useUpdateNodeInternals`. Returns a function that
 * triggers the update for one or more node ids (defaults to the current node
 * when called inside a custom node).
 *
 * @public
 */
export function injectUpdateNodeInternals(): (nodeId?: string | string[]) => void {
  const store = injectStore();
  const nodeId = injectNodeId();

  return (id?: string | string[]) => {
    if (!id && !nodeId) {
      throw new Error('When using outside of a node, you must provide an id.');
    }

    const updateIds = id ? (Array.isArray(id) ? id : [id]) : [nodeId!];
    const updates = new Map<string, InternalNodeUpdate>();

    updateIds.forEach((updateId) => {
      const nodeElement = store.domNode?.querySelector(
        `.ng-flow__node[data-id="${updateId}"]`,
      ) as HTMLDivElement | null;

      if (nodeElement) {
        updates.set(updateId, { id: updateId, nodeElement, force: true });
      }
    });

    requestAnimationFrame(() => store.updateNodeInternals(updates));
  };
}
