import { computed, effect, type Signal } from '@angular/core';

import {
  areConnectionMapsEqual,
  handleConnectionChange,
  type NodeConnection,
  type UseNodeConnectionsParams,
} from '../system';
import { injectNodeId } from '../store/context';
import { injectStore } from './inject-store';

type ConnectionMap = Map<string, NodeConnection>;

const initialConnections: NodeConnection[] = [];

/**
 * Hook to retrieve all edges connected to a node, optionally filtered by handle
 * type and id. Angular port of Svelte Flow's `useNodeConnections`. When
 * `onConnect`/`onDisconnect` are supplied they fire as connections appear and
 * disappear (registered through an `effect`, so call this in an injection
 * context). Returns a reactive {@link Signal} of the current connections.
 *
 * @public
 */
export function injectNodeConnections({
  id,
  handleType,
  handleId,
  onConnect,
  onDisconnect,
}: UseNodeConnectionsParams = {}): Signal<NodeConnection[]> {
  const store = injectStore();
  const contextNodeId = injectNodeId();
  const nodeId = id ?? contextNodeId;

  let connectionMaps: { previous: ConnectionMap; next: ConnectionMap } = {
    previous: new Map(),
    next: new Map(),
  };
  let connectionsArray: NodeConnection[] = initialConnections;

  const connections = computed(() => {
    // Subscribe to edge changes.
    store.edges;

    const prevConnections = connectionMaps.next;
    const nextConnections =
      store.connectionLookup.get(
        `${nodeId}${handleType ? (handleId ? `-${handleType}-${handleId}` : `-${handleType}`) : ''}`,
      ) ?? new Map();

    if (!areConnectionMapsEqual(nextConnections, prevConnections)) {
      connectionMaps = { previous: prevConnections, next: nextConnections };
      connectionsArray = Array.from(nextConnections.values() || initialConnections);
    }
    return connectionsArray;
  });

  if (onConnect || onDisconnect) {
    effect(() => {
      // Subscribe to connection changes.
      connections();

      if (onConnect) {
        handleConnectionChange(connectionMaps.next, connectionMaps.previous, onConnect);
      }
      if (onDisconnect) {
        handleConnectionChange(connectionMaps.previous, connectionMaps.next, onDisconnect);
      }
    });
  }

  return connections;
}
