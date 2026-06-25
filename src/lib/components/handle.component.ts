import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';

import {
  Position,
  XYHandle,
  isMouseEvent,
  areConnectionMapsEqual,
  handleConnectionChange,
  ConnectionMode,
  getHostForElement,
  type HandleConnection,
  type Optional,
  type ConnectionState,
  type FinalConnectionState,
  type Connection,
  type HandleType,
  type IsValidConnection,
  type OnConnect,
} from '../system';

import { FLOW_STORE, NODE_ID, NODE_CONNECTABLE } from '../store/context';

/**
 * The Handle is the connectable port of a node. Angular port of Svelte Flow's
 * `Handle.svelte`. It is used inside custom node components:
 *
 * ```html
 * <ng-flow-handle type="target" [position]="Position.Top" />
 * ```
 */
@Component({
  selector: 'ng-flow-handle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-handleid]': 'handleId()',
    '[attr.data-nodeid]': 'nodeId',
    '[attr.data-handlepos]': 'position()',
    '[attr.data-id]': 'dataId()',
    '[attr.role]': '"button"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.tabindex]': '-1',
    '[style]': 'style()',
    '(mousedown)': 'onpointerdown($event)',
    '(touchstart)': 'onpointerdown($event)',
    '(click)': 'onClickHandler($event)',
  },
})
export class HandleComponent {
  private readonly store = inject(FLOW_STORE);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly nodeId = inject(NODE_ID, { optional: true }) ?? '';
  private readonly connectableContext = inject(NODE_CONNECTABLE, { optional: true });

  readonly handleId = input<string | null>(null, { alias: 'id' });
  readonly type = input<HandleType>('source');
  readonly position = input<Position>(Position.Top);
  readonly style = input<string | undefined>(undefined);
  readonly className = input<string | undefined>(undefined, { alias: 'class' });
  readonly isConnectableProp = input<boolean | undefined>(undefined, { alias: 'isConnectable' });
  readonly isConnectableStart = input<boolean>(true);
  readonly isConnectableEnd = input<boolean>(true);
  readonly isValidConnection = input<IsValidConnection | undefined>(undefined);
  readonly onconnect = input<((connections: HandleConnection[]) => void) | undefined>(undefined);
  readonly ondisconnect = input<((connections: HandleConnection[]) => void) | undefined>(undefined);

  readonly isTarget = computed(() => this.type() === 'target');
  readonly isConnectable = computed(() =>
    this.isConnectableProp() !== undefined
      ? this.isConnectableProp()!
      : (this.connectableContext?.value ?? true),
  );

  readonly ariaLabel = computed(() => this.store.ariaLabelConfig['handle.ariaLabel']);

  readonly dataId = computed(
    () => `${this.store.flowId}-${this.nodeId}-${this.handleId() ?? 'null'}-${this.type()}`,
  );

  // Connection-state derivations (mirrors the Svelte $derived.by block).
  private readonly connectionState = computed(() => {
    if (!this.store.connection.inProgress) {
      return {
        connectionInProgress: false,
        connectingFrom: false,
        connectingTo: false,
        isPossibleTargetHandle: false,
        valid: false,
      };
    }

    const { fromHandle, toHandle, isValid } = this.store.connection;
    const nodeId = this.nodeId;
    const type = this.type();
    const handleId = this.handleId();

    const connectingFrom =
      !!fromHandle &&
      fromHandle.nodeId === nodeId &&
      fromHandle.type === type &&
      fromHandle.id === handleId;

    const connectingTo =
      !!toHandle && toHandle.nodeId === nodeId && toHandle.type === type && toHandle.id === handleId;

    const isPossibleTargetHandle =
      this.store.connectionMode === ConnectionMode.Strict
        ? fromHandle?.type !== type
        : nodeId !== fromHandle?.nodeId || handleId !== fromHandle?.id;

    const valid = connectingTo && isValid;

    return {
      connectionInProgress: true,
      connectingFrom,
      connectingTo,
      isPossibleTargetHandle,
      valid,
    };
  });

  readonly hostClasses = computed(() => {
    const position = this.position();
    const c = this.connectionState();
    const isConnectable = this.isConnectable();
    const classes = [
      'ng-flow__handle',
      `ng-flow__handle-${position}`,
      this.store.noDragClass,
      this.store.noPanClass,
      position,
      this.className(),
      this.isTarget() ? 'target' : 'source',
      this.isConnectableStart() ? 'connectablestart' : '',
      this.isConnectableEnd() ? 'connectableend' : '',
      isConnectable ? 'connectable' : '',
    ];
    if (c.valid) classes.push('valid');
    if (c.connectingTo) classes.push('connectingto');
    if (c.connectingFrom) classes.push('connectingfrom');

    const connectionIndicator =
      isConnectable &&
      (!c.connectionInProgress || c.isPossibleTargetHandle) &&
      (c.connectionInProgress || this.store.clickConnectStartHandle
        ? this.isConnectableEnd()
        : this.isConnectableStart());
    if (connectionIndicator) classes.push('connectionindicator');

    return classes.filter(Boolean).join(' ');
  });

  constructor() {
    let prevConnections: Map<string, HandleConnection> | null = null;
    effect(() => {
      const onconnect = this.onconnect();
      const ondisconnect = this.ondisconnect();
      if (onconnect || ondisconnect) {
        // connectionLookup is not reactive; read edges to subscribe to updates.
        void this.store.edges;
        const connections = this.store.connectionLookup.get(
          `${this.nodeId}-${this.type()}${this.handleId() ? `-${this.handleId()}` : ''}`,
        );

        if (prevConnections && !areConnectionMapsEqual(connections, prevConnections)) {
          const next = connections ?? new Map();
          handleConnectionChange(prevConnections, next, ondisconnect);
          handleConnectionChange(next, prevConnections, onconnect);
        }

        prevConnections = new Map(connections);
      }
    });
  }

  private onConnectExtended(connection: Connection) {
    const edge = this.store.onbeforeconnect ? this.store.onbeforeconnect(connection) : connection;
    if (!edge) {
      return;
    }
    this.store.addEdge(edge);
    (this.store.onconnect as OnConnect | undefined)?.(connection);
  }

  onpointerdown(event: MouseEvent | TouchEvent) {
    const isMouseTriggered = isMouseEvent(event);
    if (
      event.currentTarget &&
      ((isMouseTriggered && (event as MouseEvent).button === 0) || !isMouseTriggered)
    ) {
      XYHandle.onPointerDown(event, {
        handleId: this.handleId(),
        nodeId: this.nodeId,
        isTarget: this.isTarget(),
        connectionRadius: this.store.connectionRadius,
        domNode: this.store.domNode as HTMLDivElement | null,
        nodeLookup: this.store.nodeLookup,
        connectionMode: this.store.connectionMode,
        lib: 'angular',
        autoPanOnConnect: this.store.autoPanOnConnect,
        autoPanSpeed: this.store.autoPanSpeed,
        flowId: this.store.flowId,
        isValidConnection:
          this.isValidConnection() ||
          ((...args) => this.store.isValidConnection?.(...args) ?? true),
        updateConnection: this.store.updateConnection,
        cancelConnection: this.store.cancelConnection,
        panBy: this.store.panBy,
        onConnect: (c) => this.onConnectExtended(c),
        onConnectStart: this.store.onconnectstart,
        onConnectEnd: (...args) => this.store.onconnectend?.(...args),
        getTransform: () => [
          this.store.viewport.x,
          this.store.viewport.y,
          this.store.viewport.zoom,
        ],
        getFromHandle: () => this.store.connection.fromHandle,
        dragThreshold: this.store.connectionDragThreshold,
        handleDomNode: event.currentTarget as HTMLElement,
      });
    }
  }

  onClickHandler(event: MouseEvent) {
    if (!this.store.clickConnect) {
      return;
    }
    const nodeId = this.nodeId;
    const handleId = this.handleId();
    const type = this.type();

    if (!nodeId || (!this.store.clickConnectStartHandle && !this.isConnectableStart())) {
      return;
    }

    if (!this.store.clickConnectStartHandle) {
      this.store.onclickconnectstart?.(event, { nodeId, handleId, handleType: type });
      this.store.clickConnectStartHandle = { nodeId, type, id: handleId };
      return;
    }

    const doc = getHostForElement(event.target as HTMLElement);
    const isValidConnectionHandler = this.isValidConnection() ?? this.store.isValidConnection;

    const { connectionMode, clickConnectStartHandle, flowId, nodeLookup } = this.store;
    const { connection, isValid } = XYHandle.isValid(event, {
      handle: { nodeId, id: handleId, type },
      connectionMode,
      fromNodeId: clickConnectStartHandle.nodeId,
      fromHandleId: clickConnectStartHandle.id ?? null,
      fromType: clickConnectStartHandle.type,
      isValidConnection: isValidConnectionHandler,
      flowId,
      doc,
      lib: 'angular',
      nodeLookup,
    });

    if (isValid && connection) {
      this.onConnectExtended(connection);
    }

    const connectionClone = structuredClone(this.store.connection) as Optional<
      ConnectionState,
      'inProgress'
    >;
    delete connectionClone.inProgress;
    connectionClone.toPosition = connectionClone.toHandle ? connectionClone.toHandle.position : null;
    this.store.onclickconnectend?.(event, connectionClone as FinalConnectionState);

    this.store.clickConnectStartHandle = null;
  }
}
