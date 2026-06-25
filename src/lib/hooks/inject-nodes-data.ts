import { computed, type Signal } from '@angular/core';

import { shallowNodeData, type DistributivePick } from '../system';
import type { Edge, Node } from '../types';
import { injectStore } from './inject-store';
import { read, type MaybeSignal } from './util';

type NodeData<NodeType extends Node> = DistributivePick<NodeType, 'id' | 'data' | 'type'>;

/**
 * Hook for receiving the `{ id, type, data }` of one or multiple nodes. Angular
 * port of Svelte Flow's `useNodesData`. The id(s) may be plain or a
 * {@link Signal}. Returns a reactive {@link Signal} whose reference only changes
 * when the selected data actually changes (shallow-compared, like Svelte).
 *
 * @public
 */
export function injectNodesData<NodeType extends Node = Node>(
  nodeId: MaybeSignal<string>,
): Signal<NodeData<NodeType> | null>;
export function injectNodesData<NodeType extends Node = Node>(
  nodeIds: MaybeSignal<string[]>,
): Signal<NodeData<NodeType>[]>;
export function injectNodesData(
  nodeIds: MaybeSignal<string | string[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Signal<any> {
  const store = injectStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prevNodesData: any[] = [];
  let initialRun = true;

  return computed(() => {
    // Subscribe to node changes.
    store.nodes;

    const ids = read(nodeIds);
    const isArrayOfIds = Array.isArray(ids);
    const _nodeIds = isArrayOfIds ? ids : [ids];

    const nextNodesData = [];
    for (const nodeId of _nodeIds) {
      const node = store.nodeLookup.get(nodeId)?.internals.userNode;
      if (node) {
        nextNodesData.push({ id: node.id, type: node.type, data: node.data });
      }
    }

    if (!shallowNodeData(nextNodesData, prevNodesData) || initialRun) {
      prevNodesData = nextNodesData;
      initialRun = false;
    }

    return isArrayOfIds ? prevNodesData : (prevNodesData[0] ?? null);
  });
}
