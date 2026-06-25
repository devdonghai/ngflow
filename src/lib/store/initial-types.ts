import type { NodeTypes, EdgeTypes } from '../types';

import { DefaultNodeComponent } from '../components/nodes/default-node.component';
import { InputNodeComponent } from '../components/nodes/input-node.component';
import { OutputNodeComponent } from '../components/nodes/output-node.component';
import { GroupNodeComponent } from '../components/nodes/group-node.component';

/**
 * The built-in node/edge type maps. Built-in edges (bezier/step/smoothstep/
 * straight) are rendered inline by the EdgeWrapper, so the edge map stays empty
 * — the wrapper resolves the path from the edge `type` directly.
 */
export const initialNodeTypes: NodeTypes = {
  input: InputNodeComponent,
  output: OutputNodeComponent,
  default: DefaultNodeComponent,
  group: GroupNodeComponent,
};

export const initialEdgeTypes: EdgeTypes = {};
