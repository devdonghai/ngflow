import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type Position,
} from '../../system';

/**
 * Computes the SVG path string and label anchor for a built-in edge type.
 * Mirrors the per-type `getXxxPath` calls in Svelte Flow's built-in edge
 * components. Returns `[path, labelX, labelY]`.
 */
export function getBuiltInEdgePath(
  type: string | undefined,
  params: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
  },
): [string, number, number] {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = params;

  let result: [string, number, number, number, number];
  switch (type) {
    case 'straight':
      result = getStraightPath({ sourceX, sourceY, targetX, targetY });
      break;
    case 'step':
      result = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 0,
      });
      break;
    case 'smoothstep':
      result = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      });
      break;
    case 'default':
    default:
      result = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      });
      break;
  }
  return [result[0], result[1], result[2]];
}
