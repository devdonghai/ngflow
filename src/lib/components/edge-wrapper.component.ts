import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { elementSelectionKeys, getMarkerId } from '../system';
import { injectFlowStore } from '../store/context';
import type { Edge, EdgeLayouted, Node } from '../types';
import { getBuiltInEdgePath } from './edges/edge-path';
import { EdgeLabelComponent } from './edges/edge-label.component';

const ARIA_EDGE_DESC_KEY = 'ng-flow__edge-desc';

/**
 * Renders a single edge. Angular port of Svelte Flow's `EdgeWrapper`. For the
 * built-in edge types the path/label are rendered inline (SVG-namespace safe);
 * custom edge-type components are handled in a later phase.
 */
@Component({
  selector: 'ng-flow-edge-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EdgeLabelComponent],
  template: `
    @if (!hidden()) {
      <svg [style.z-index]="zIndex()" class="ng-flow__edge-wrapper">
        <svg:g
          #edgeRef
          [class]="edgeClasses()"
          [attr.data-id]="id()"
          (click)="onclick($event)"
          (contextmenu)="onContextMenu($event)"
          (pointerenter)="onPointerEnter($event)"
          (pointerleave)="onPointerLeave($event)"
          (keydown)="onKeyDown($event)"
          [attr.aria-label]="ariaLabelText()"
          [attr.aria-describedby]="focusable() ? ARIA_EDGE_DESC_KEY + '-' + store.flowId : null"
          [attr.role]="role()"
          aria-roledescription="edge"
          [attr.tabindex]="focusable() ? 0 : null"
        >
          <svg:path
            [attr.id]="id()"
            [attr.d]="pathData()[0]"
            class="ng-flow__edge-path"
            [attr.marker-start]="markerStartUrl()"
            [attr.marker-end]="markerEndUrl()"
            fill="none"
            [style]="style()"
          />
          @if (interactionWidth() > 0) {
            <svg:path
              [attr.d]="pathData()[0]"
              stroke-opacity="0"
              [attr.stroke-width]="interactionWidth()"
              fill="none"
              class="ng-flow__edge-interaction"
            />
          }
          @if (label()) {
            <ng-flow-edge-label
              [edgeId]="id()"
              [x]="pathData()[1]"
              [y]="pathData()[2]"
              [style]="labelStyle()"
              [selectEdgeOnClick]="true"
            >
              {{ label() }}
            </ng-flow-edge-label>
          }
        </svg:g>
      </svg>
    }
  `,
})
export class EdgeWrapperComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  readonly store = injectFlowStore<NodeType, EdgeType>();
  protected readonly ARIA_EDGE_DESC_KEY = ARIA_EDGE_DESC_KEY;

  readonly edge = input.required<EdgeLayouted<EdgeType>>();

  readonly id = computed(() => this.edge().id);
  readonly type = computed(() => this.edge().type ?? 'default');
  readonly hidden = computed(() => this.edge().hidden ?? false);
  readonly animated = computed(() => this.edge().animated ?? false);
  readonly selected = computed(() => this.edge().selected ?? false);
  readonly label = computed(() => this.edge().label);
  readonly labelStyle = computed(() => this.edge().labelStyle);
  readonly style = computed(() => this.edge().style);
  readonly zIndex = computed(() => this.edge().zIndex);
  readonly ariaLabel = computed(() => this.edge().ariaLabel);
  readonly className = computed(() => this.edge().class);

  readonly interactionWidth = computed(() => this.edge().interactionWidth ?? 20);

  readonly selectable = computed(
    () => this.edge().selectable ?? this.store.elementsSelectable,
  );
  readonly focusable = computed(() => this.edge().focusable ?? this.store.edgesFocusable);

  readonly markerStartUrl = computed(() => {
    const m = this.edge().markerStart;
    return m ? `url('#${getMarkerId(m, this.store.flowId)}')` : null;
  });
  readonly markerEndUrl = computed(() => {
    const m = this.edge().markerEnd;
    return m ? `url('#${getMarkerId(m, this.store.flowId)}')` : null;
  });

  readonly pathData = computed<[string, number, number]>(() => {
    const e = this.edge();
    return getBuiltInEdgePath(this.type(), {
      sourceX: e.sourceX,
      sourceY: e.sourceY,
      targetX: e.targetX,
      targetY: e.targetY,
      sourcePosition: e.sourcePosition,
      targetPosition: e.targetPosition,
    });
  });

  readonly edgeClasses = computed(() => {
    const classValue = this.className();
    const classes = ['ng-flow__edge'];
    if (typeof classValue === 'string') classes.push(classValue);
    if (this.animated()) classes.push('animated');
    if (this.selected()) classes.push('selected');
    if (this.selectable()) classes.push('selectable');
    return classes.join(' ');
  });

  readonly ariaLabelText = computed(() => {
    const aria = this.ariaLabel();
    if (aria === null) return null;
    if (aria) return aria;
    const e = this.edge();
    return `Edge from ${e.source} to ${e.target}`;
  });

  readonly role = computed(
    () => this.edge().ariaRole ?? (this.focusable() ? 'group' : 'img'),
  );

  onclick(event: MouseEvent): void {
    const id = this.id();
    const edge = this.store.edgeLookup.get(id);
    if (edge) {
      if (this.selectable()) this.store.handleEdgeSelection(id);
      this.store.flowProps.onedgeclick?.({ event, edge });
    }
  }

  onContextMenu(event: MouseEvent): void {
    const edge = this.store.edgeLookup.get(this.id());
    if (edge) this.store.flowProps.onedgecontextmenu?.({ event, edge });
  }

  onPointerEnter(event: PointerEvent): void {
    const edge = this.store.edgeLookup.get(this.id());
    if (edge) this.store.flowProps.onedgepointerenter?.({ event, edge });
  }

  onPointerLeave(event: PointerEvent): void {
    const edge = this.store.edgeLookup.get(this.id());
    if (edge) this.store.flowProps.onedgepointerleave?.({ event, edge });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (
      !this.store.disableKeyboardA11y &&
      elementSelectionKeys.includes(event.key) &&
      this.selectable()
    ) {
      const unselect = event.key === 'Escape';
      if (unselect) {
        this.store.unselectNodesAndEdges({ edges: [this.edge() as unknown as EdgeType] });
      } else {
        this.store.addSelectedEdges([this.id()]);
      }
    }
  }
}
