import { Directive, ElementRef, OnDestroy, OnInit, effect, inject, input } from '@angular/core';

import { XYDrag, type NodeBase, type OnDrag } from '../system';
import type { Edge, Node } from '../types';
import type { FlowStore } from '../store/types';

/**
 * Parameters consumed by the {@link DragDirective}. Ported from the Svelte `drag`
 * action params; `store` is the shared NgFlow store.
 */
export interface DragParams<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  store: FlowStore<NodeType, EdgeType>;
  disabled?: boolean;
  noDragClass?: string;
  handleSelector?: string;
  nodeId?: string;
  isSelectable?: boolean;
  nodeClickDistance?: number;
  onDrag?: OnDrag;
  onDragStart?: OnDrag;
  onDragStop?: OnDrag;
  onNodeMouseDown?: (id: string) => void;
}

/**
 * Angular port of Svelte Flow's `drag` action. Wires an {@link XYDrag} instance
 * to the host element and feeds it live store data via `getStoreItems`.
 */
@Directive({
  selector: '[ngflowDrag]',
  standalone: true,
})
export class DragDirective<NodeType extends Node = Node, EdgeType extends Edge = Edge>
  implements OnInit, OnDestroy
{
  private readonly host = inject(ElementRef<Element>);

  readonly params = input.required<DragParams<NodeType, EdgeType>>({ alias: 'ngflowDrag' });

  private dragInstance: ReturnType<typeof XYDrag<NodeType, EdgeType>> | null = null;

  constructor() {
    effect(() => {
      const params = this.params();
      if (this.dragInstance) {
        this.applyUpdate(params);
      }
    });
  }

  ngOnInit(): void {
    const { store, onDrag, onDragStart, onDragStop, onNodeMouseDown } = this.params();

    this.dragInstance = XYDrag<NodeType, EdgeType>({
      onDrag,
      onDragStart,
      onDragStop,
      onNodeMouseDown,
      getStoreItems: () => {
        const { snapGrid, viewport } = store;
        return {
          nodes: store.nodes satisfies NodeBase[],
          nodeLookup: store.nodeLookup,
          edges: store.edges,
          nodeExtent: store.nodeExtent,
          snapGrid: snapGrid ? snapGrid : [0, 0],
          snapToGrid: !!snapGrid,
          nodeOrigin: store.nodeOrigin,
          multiSelectionActive: store.multiselectionKeyPressed,
          domNode: store.domNode,
          transform: [viewport.x, viewport.y, viewport.zoom],
          autoPanOnNodeDrag: store.autoPanOnNodeDrag,
          nodesDraggable: store.nodesDraggable,
          selectNodesOnDrag: store.selectNodesOnDrag,
          nodeDragThreshold: store.nodeDragThreshold,
          unselectNodesAndEdges: store.unselectNodesAndEdges,
          updateNodePositions: store.updateNodePositions,
          onSelectionDrag: store.onselectiondrag,
          onSelectionDragStart: store.onselectiondragstart,
          onSelectionDragStop: store.onselectiondragstop,
          panBy: store.panBy,
        };
      },
    });

    this.applyUpdate(this.params());
  }

  private applyUpdate(params: DragParams<NodeType, EdgeType>): void {
    if (!this.dragInstance) {
      return;
    }
    if (params.disabled) {
      this.dragInstance.destroy();
      return;
    }
    this.dragInstance.update({
      domNode: this.host.nativeElement,
      noDragClassName: params.noDragClass,
      handleSelector: params.handleSelector,
      nodeId: params.nodeId,
      isSelectable: params.isSelectable,
      nodeClickDistance: params.nodeClickDistance,
    });
  }

  ngOnDestroy(): void {
    this.dragInstance?.destroy();
  }
}
