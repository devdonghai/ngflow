import {
  addEdge as addEdgeSystem,
  createDevWarn,
  type AddEdgeOptions,
  type Connection,
  type EdgeBase,
} from '../system';

const defaultOnError = createDevWarn('NgFlow', 'https://xyflow.com/');

export function addEdge<EdgeType extends EdgeBase>(
  edgeParams: EdgeType | Connection,
  edges: EdgeType[],
  options: AddEdgeOptions = {},
): EdgeType[] {
  return addEdgeSystem(edgeParams, edges, {
    ...options,
    onError: options.onError ?? defaultOnError,
  });
}
