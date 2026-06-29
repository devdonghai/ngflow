# NgFlow

An Angular port of [xyflow](https://github.com/xyflow/xyflow) (React Flow / Svelte
Flow) — a highly customizable component for building node-based editors, workflow
builders, diagrams and more. It is built on top of xyflow's framework-agnostic core
(`@xyflow/system`, vendored into this library) and uses Angular **signals** for
reactivity, mirroring the Svelte Flow architecture.

## Features

- Pan / zoom canvas, draggable nodes, multi-selection box
- Connecting nodes via handles, validatable connections
- Built-in nodes (`default`, `input`, `output`, `group`) and edges
  (`bezier`, `step`, `smoothstep`, `straight`)
- Custom nodes and edges via Angular component inputs
- Plugins: **Background**, **Controls**, **MiniMap**, **NodeToolbar**,
  **EdgeToolbar**, **NodeResizer**
- Injectable hooks: `injectFlow`, `injectStore`, `injectConnection`,
  `injectNodesData`, `injectNodeConnections`, `injectInternalNode`,
  `injectUpdateNodeInternals`, `injectInitialized`, `injectOnSelectionChange`,
  `injectColorMode`

## Requirements

- Angular `^22.0.0` (standalone components + signals)

## Installation

```bash
npm install @devdonghai/ngflow
```

The `d3-drag`, `d3-selection`, `d3-zoom` and `d3-interpolate` runtime
dependencies are installed automatically.

## Styles

Import the stylesheet once in your app (e.g. `angular.json` `styles` array or a
global `styles.css`):

```json
"styles": [
  "node_modules/@devdonghai/ngflow/styles/style.css",
  "src/styles.css"
]
```

`style.css` is the full default theme. For a minimal, unstyled base (just the
structural rules needed for layout) use `node_modules/@devdonghai/ngflow/styles/base.css`
instead.

## Quick start

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  NgFlowComponent,
  BackgroundComponent,
  BackgroundVariant,
  ControlsComponent,
  MiniMapComponent,
  type Node,
  type Edge,
} from '@devdonghai/ngflow';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFlowComponent, BackgroundComponent, ControlsComponent, MiniMapComponent],
  template: `
    <div style="width: 100vw; height: 100vh">
      <ng-flow [(nodes)]="nodes" [(edges)]="edges" [fitView]="true">
        <ng-flow-background [variant]="dots" [gap]="16" />
        <ng-flow-controls />
        <ng-flow-minimap />
      </ng-flow>
    </div>
  `,
})
export class App {
  protected readonly dots = BackgroundVariant.Dots;

  readonly nodes = signal<Node[]>([
    { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' }, type: 'input' },
    { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
    { id: '3', position: { x: 400, y: 0 }, data: { label: 'Node 3' }, type: 'output' },
  ]);

  readonly edges = signal<Edge[]>([
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
  ]);
}
```

`nodes`, `edges` and `viewport` are two-way `model()` bindings — use
`[(nodes)]` / `[(edges)]` to keep your signals in sync with user interactions
(dragging, connecting, selecting).

## Custom nodes

Provide a component class through the `nodeTypes` map. The component renders its
handles with `<ng-flow-handle>`:

```ts
import { Component } from '@angular/core';
import { HandleComponent, Position } from '@devdonghai/ngflow';

@Component({
  selector: 'app-my-node',
  imports: [HandleComponent],
  template: `
    <div class="my-node">Custom</div>
    <ng-flow-handle type="target" [position]="left" />
    <ng-flow-handle type="source" [position]="right" />
  `,
})
export class MyNode {
  protected readonly left = Position.Left;
  protected readonly right = Position.Right;
}

// in your flow component:
readonly nodeTypes = { myNode: MyNode };
// template: <ng-flow [nodeTypes]="nodeTypes" ... />
```

## Hooks

Inject the flow instance to drive the canvas imperatively:

```ts
import { injectFlow } from '@devdonghai/ngflow';

const flow = injectFlow();
flow.fitView();
flow.setCenter(0, 0, { zoom: 1.5 });
const nodes = flow.getNodes();
```

## Building from source

```bash
npm install
npm run build     # build styles + library -> dist/ngflow
npm run watch     # rebuild on change
npm test          # run the vitest suite
```

The `npm run build` step first assembles the CSS bundles
(`styles/dist/{style,base}.css`) via `styles/build-styles.mjs`, then runs
`ng-packagr` to produce the publishable package in `dist/ngflow`.

## License

[MIT](./LICENSE) © NgFlow contributors. This project is a port of, and builds
upon, the MIT-licensed [xyflow](https://github.com/xyflow/xyflow) project.
