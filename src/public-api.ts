/*
 * Public API Surface of xyflow-angular (NgFlow)
 *
 * NOTE: During the early phases this re-exports the vendored framework-agnostic
 * core (`@xyflow/system`) plus the Angular type/util layer. Angular-specific
 * exports (NgFlow component, FlowStore, hooks, plugins) are added in later phases.
 */

// Vendored core (framework-agnostic)
export * from './lib/system';

// Angular type layer
export * from './lib/types';

// utils
export * from './lib/utils';

// store (FlowStore, DI context, props)
export * from './lib/store';

// directives (drag, pan/zoom, portal)
export * from './lib/directives';

// components (Handle, wrappers, built-in nodes/edges)
export * from './lib/components';

// containers (NgFlow root + layout layers)
export * from './lib/container';

// hooks (injectable public API: injectFlow, injectStore, ...)
export * from './lib/hooks';

// plugins (Background, Controls, MiniMap, toolbars, NodeResizer)
export * from './lib/plugins';

/*
 * The Angular layer intentionally specializes a few names that the core also
 * exports (e.g. NodeProps adds Angular-specific fields, addEdge defaults the
 * NgFlow dev-warning). Explicit re-exports win over the `export *` above and
 * resolve the ambiguity, mirroring how Svelte Flow curates its public surface.
 */
export type { NodeProps, IsValidConnection, OnSelectionDrag } from './lib/types';
export { addEdge } from './lib/utils';
