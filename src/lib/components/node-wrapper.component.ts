import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  type Type,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import {
  elementSelectionKeys,
  errorMessages,
  isInputDOMNode,
  nodeHasDimensions,
  getNodesInside,
  Position,
} from '../system';

import { FLOW_STORE, NODE_ID, NODE_CONNECTABLE, injectFlowStore } from '../store/context';
import { arrowKeyDiffs, toPxString } from '../utils';
import type { Edge, InternalNode, Node } from '../types';
import { DefaultNodeComponent } from './nodes/default-node.component';
import { DragDirective, type DragParams } from '../directives/drag.directive';
import { pickDeclaredInputs } from './dynamic-io';

const ARIA_NODE_DESC_KEY = 'ng-flow__node-desc';

/**
 * Renders a single node. Angular port of Svelte Flow's `NodeWrapper`. The node's
 * outer `<div class="ng-flow__node">` carries the drag behaviour, classes and
 * a11y wiring; the user/built-in node component is projected inside via
 * {@link NgComponentOutlet}, with `NODE_ID`/`NODE_CONNECTABLE` provided through a
 * dedicated injector so descendant `Handle`s resolve their context.
 */
@Component({
  selector: 'ng-flow-node-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, DragDirective],
  template: `
    @if (!hidden()) {
      <div
        #nodeRef
        [ngflowDrag]="dragParams()"
        [attr.data-id]="id"
        [class]="nodeClasses()"
        [style.z-index]="zIndex()"
        [style.transform]="transform()"
        [style.visibility]="hasDimensions() ? 'visible' : 'hidden'"
        [style]="nodeStyle()"
        (click)="onSelectNodeHandler($event)"
        (pointerenter)="onPointerEnter($event)"
        (pointerleave)="onPointerLeave($event)"
        (pointermove)="onPointerMove($event)"
        (contextmenu)="onContextMenu($event)"
        (keydown)="onKeyDown($event)"
        (focus)="onFocus()"
        [attr.tabindex]="focusable() ? 0 : null"
        [attr.role]="role()"
        [attr.aria-label]="node().ariaLabel"
        aria-roledescription="node"
        [attr.aria-describedby]="ariaDescribedBy()"
      >
        <ng-container
          [ngComponentOutlet]="nodeComponent()"
          [ngComponentOutletInputs]="nodeInputs()"
          [ngComponentOutletInjector]="nodeInjector()"
        />
      </div>
    }
  `,
})
export class NodeWrapperComponent<NodeType extends Node = Node, EdgeType extends Edge = Edge> {
  readonly store = injectFlowStore<NodeType, EdgeType>();
  private readonly hostInjector = inject(Injector);

  readonly node = input.required<InternalNode<NodeType>>();
  readonly resizeObserver = input<ResizeObserver | null>(null);
  readonly nodeClickDistance = input<number | undefined>(undefined);

  private readonly nodeRef = viewChild<ElementRef<HTMLDivElement>>('nodeRef');

  /** The node id is stable for the lifetime of this wrapper. */
  get id(): string {
    return this.node().id;
  }

  readonly type = computed(() => this.node().type ?? 'default');
  readonly hidden = computed(() => this.node().hidden ?? false);
  readonly selected = computed(() => this.node().selected ?? false);
  readonly dragging = computed(() => this.node().dragging ?? false);
  readonly zIndex = computed(() => this.node().internals.z ?? 0);
  readonly positionX = computed(() => this.node().internals.positionAbsolute.x);
  readonly positionY = computed(() => this.node().internals.positionAbsolute.y);
  readonly sourcePosition = computed(() => this.node().sourcePosition);
  readonly targetPosition = computed(() => this.node().targetPosition);

  readonly draggable = computed(() => this.node().draggable ?? this.store.nodesDraggable);
  readonly selectable = computed(() => this.node().selectable ?? this.store.elementsSelectable);
  readonly connectable = computed(() => this.node().connectable ?? this.store.nodesConnectable);
  readonly focusable = computed(() => this.node().focusable ?? this.store.nodesFocusable);

  readonly hasDimensions = computed(() => nodeHasDimensions(this.node()));
  readonly hasHandleBounds = computed(() => !!this.node().internals.handleBounds);
  readonly isInitialized = computed(() => this.hasDimensions() && this.hasHandleBounds());
  readonly isParent = computed(() => this.store.parentLookup.has(this.id));

  readonly nodeComponent = computed<Type<unknown>>(
    () => (this.store.nodeTypes[this.type()] as Type<unknown>) ?? DefaultNodeComponent,
  );

  readonly transform = computed(() => `translate(${this.positionX()}px, ${this.positionY()}px)`);

  readonly nodeClasses = computed(() => {
    const node = this.node();
    const classes = ['ng-flow__node', `ng-flow__node-${this.type()}`];
    if (typeof node.class === 'string') classes.push(node.class);
    if (this.dragging()) classes.push('dragging');
    if (this.selected()) classes.push('selected');
    if (this.draggable()) classes.push('draggable', 'nopan');
    if (this.connectable()) classes.push('connectable');
    if (this.selectable()) classes.push('selectable');
    if (this.isParent()) classes.push('parent');
    return classes.join(' ');
  });

  readonly nodeStyle = computed(() => {
    const node = this.node();
    const style = node.style ?? '';
    const measuredWidth = node.measured?.width;
    const measuredHeight = node.measured?.height;
    const w = measuredWidth === undefined ? (node.width ?? node.initialWidth) : node.width;
    const h = measuredHeight === undefined ? (node.height ?? node.initialHeight) : node.height;
    if (w === undefined && h === undefined && !style) {
      return null;
    }
    // Assemble declarations and join with ';' so we never emit a leading or
    // doubled separator (Angular's [style] parser rejects a malformed string
    // such as ';width:..').
    const declarations: string[] = [];
    const trimmedStyle = style.trim().replace(/;\s*$/, '');
    if (trimmedStyle) declarations.push(trimmedStyle);
    if (w) declarations.push(`width:${toPxString(w)}`);
    if (h) declarations.push(`height:${toPxString(h)}`);
    return declarations.length ? `${declarations.join(';')};` : null;
  });

  readonly role = computed(
    () => this.node().ariaRole ?? (this.focusable() ? 'group' : null),
  );
  readonly ariaDescribedBy = computed(() =>
    this.store.disableKeyboardA11y ? null : `${ARIA_NODE_DESC_KEY}-${this.store.flowId}`,
  );

  /** Reactive connectable context handed to descendant Handles. */
  private readonly connectableContext = { value: true };

  private readonly _nodeInjector = computed<Injector>(() =>
    Injector.create({
      providers: [
        { provide: NODE_ID, useValue: this.id },
        { provide: NODE_CONNECTABLE, useValue: this.connectableContext },
        { provide: FLOW_STORE, useValue: this.store },
      ],
      parent: this.hostInjector,
    }),
  );
  nodeInjector() {
    this.connectableContext.value = this.connectable();
    return this._nodeInjector();
  }

  readonly nodeInputs = computed<Record<string, unknown>>(() => {
    const node = this.node();
    const props: Record<string, unknown> = {
      data: node.data,
      id: this.id,
      selected: this.selected(),
      selectable: this.selectable(),
      deletable: node.deletable ?? true,
      sourcePosition: this.sourcePosition(),
      targetPosition: this.targetPosition(),
      zIndex: this.zIndex(),
      dragging: this.dragging(),
      draggable: this.draggable(),
      dragHandle: node.dragHandle,
      parentId: node.parentId,
      type: this.type(),
      isConnectable: this.connectable(),
      positionAbsoluteX: this.positionX(),
      positionAbsoluteY: this.positionY(),
      width: node.width,
      height: node.height,
    };
    return pickDeclaredInputs(this.nodeComponent(), props);
  });

  readonly dragParams = computed<DragParams<NodeType, EdgeType>>(() => ({
    store: this.store,
    nodeId: this.id,
    isSelectable: this.selectable(),
    disabled: !this.draggable(),
    handleSelector: this.node().dragHandle,
    noDragClass: this.store.noDragClass,
    nodeClickDistance: this.nodeClickDistance(),
    onNodeMouseDown: (id: string) => this.store.handleNodeSelection(id),
    onDrag: (event, _, targetNode, nodes) =>
      this.store.flowProps.onnodedrag?.({
        event,
        targetNode: targetNode as NodeType,
        nodes: nodes as NodeType[],
      }),
    onDragStart: (event, _, targetNode, nodes) =>
      this.store.flowProps.onnodedragstart?.({
        event,
        targetNode: targetNode as NodeType,
        nodes: nodes as NodeType[],
      }),
    onDragStop: (event, _, targetNode, nodes) =>
      this.store.flowProps.onnodedragstop?.({
        event,
        targetNode: targetNode as NodeType,
        nodes: nodes as NodeType[],
      }),
  }));

  constructor() {
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      effect(() => {
        const type = this.type();
        if (!this.store.nodeTypes[type]) {
          this.store.onerror('003', errorMessages['error003'](type));
        }
      });
    }

    // Recalculate handle positions when type/source/target position changes.
    // The previous values are seeded on the effect's first run (once the
    // required `node` input is available) rather than in the constructor, where
    // reading the input would throw NG0950 in dev mode.
    let prevType: string | undefined;
    let prevSource: Position | undefined;
    let prevTarget: Position | undefined;
    let firstRun = true;
    effect(() => {
      const type = this.type();
      const source = this.sourcePosition();
      const target = this.targetPosition();
      const doUpdate =
        !firstRun && (type !== prevType || source !== prevSource || target !== prevTarget);
      firstRun = false;
      const el = this.nodeRef()?.nativeElement ?? null;
      if (doUpdate && el !== null) {
        requestAnimationFrame(() => {
          if (this.nodeRef()?.nativeElement) {
            this.store.updateNodeInternals(
              new Map([[this.id, { id: this.id, nodeElement: el, force: true }]]),
            );
          }
        });
      }
      prevType = type;
      prevSource = source;
      prevTarget = target;
    });

    // Observe/unobserve the node element for size changes.
    let prevNodeRef: HTMLDivElement | null = null;
    effect((onCleanup) => {
      const observer = this.resizeObserver();
      const el = this.nodeRef()?.nativeElement ?? null;
      const initialized = this.isInitialized();
      if (observer && (!initialized || el !== prevNodeRef)) {
        if (prevNodeRef) observer.unobserve(prevNodeRef);
        if (el) observer.observe(el);
        prevNodeRef = el;
      }
      onCleanup(() => {
        if (prevNodeRef && observer) {
          observer.unobserve(prevNodeRef);
          prevNodeRef = null;
        }
      });
    });
  }

  onSelectNodeHandler(event: MouseEvent): void {
    if (
      this.selectable() &&
      (!this.store.selectNodesOnDrag || !this.draggable() || this.store.nodeDragThreshold > 0)
    ) {
      this.store.handleNodeSelection(this.id);
    }
    this.store.flowProps.onnodeclick?.({ node: this.node().internals.userNode, event });
  }

  onPointerEnter(event: PointerEvent): void {
    this.store.flowProps.onnodepointerenter?.({ node: this.node().internals.userNode, event });
  }
  onPointerLeave(event: PointerEvent): void {
    this.store.flowProps.onnodepointerleave?.({ node: this.node().internals.userNode, event });
  }
  onPointerMove(event: PointerEvent): void {
    this.store.flowProps.onnodepointermove?.({ node: this.node().internals.userNode, event });
  }
  onContextMenu(event: MouseEvent): void {
    this.store.flowProps.onnodecontextmenu?.({ node: this.node().internals.userNode, event });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.focusable()) return;
    if (isInputDOMNode(event) || this.store.disableKeyboardA11y) {
      return;
    }

    const node = this.node();
    if (elementSelectionKeys.includes(event.key) && this.selectable()) {
      const unselect = event.key === 'Escape';
      this.store.handleNodeSelection(this.id, unselect, this.nodeRef()?.nativeElement);
    } else if (
      this.draggable() &&
      node.selected &&
      Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)
    ) {
      event.preventDefault();
      this.store.ariaLiveMessage = this.store.ariaLabelConfig[
        'node.a11yDescription.ariaLiveMessage'
      ]({
        direction: event.key.replace('Arrow', '').toLowerCase(),
        x: ~~node.internals.positionAbsolute.x,
        y: ~~node.internals.positionAbsolute.y,
      });
      this.store.moveSelectedNodes(arrowKeyDiffs[event.key], event.shiftKey ? 4 : 1);
    }
  }

  onFocus(): void {
    if (!this.focusable()) return;
    const el = this.nodeRef()?.nativeElement;
    if (this.store.disableKeyboardA11y || !this.store.autoPanOnNodeFocus || !el?.matches(':focus-visible')) {
      return;
    }
    const node = this.node();
    const { width, height, viewport } = this.store;
    const withinViewport =
      getNodesInside(
        new Map([[this.id, node]]),
        { x: 0, y: 0, width, height },
        [viewport.x, viewport.y, viewport.zoom],
        true,
      ).length > 0;

    if (!withinViewport) {
      this.store.setCenter(
        node.position.x + (node.measured?.width ?? 0) / 2,
        node.position.y + (node.measured?.height ?? 0) / 2,
        { zoom: viewport.zoom },
      );
    }
  }
}
