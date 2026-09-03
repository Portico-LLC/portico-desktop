import dagre from 'dagre';
import type { ArchitectGeneratedNode, WorkflowNodeConfig, WorkflowEdgeConfig } from '@/lib/types';

// Same constants as components/brain/graphLayout.ts (built for the unrelated Brain knowledge
// graph) — kept identical so both node-graph views read consistently, not because the shapes
// are related.
const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

/** Fills in `position` for every Architect-generated node via dagre — the model never thinks
 *  about layout (see `architect-schema.ts` on the backend), this is purely cosmetic and freely
 *  redraggable once it lands in the canvas. Runs on the frontend rather than the backend: dagre
 *  is already a frontend-only dependency, this is not a correctness concern worth duplicating
 *  layout constants across two languages for, and the frontend already has to adapt the SSE
 *  payload's shape into store-ready types regardless. */
export function layoutGeneratedGraph(nodes: ArchitectGeneratedNode[], edges: WorkflowEdgeConfig[]): WorkflowNodeConfig[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 96 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      type: node.type,
      position: { x: (pos?.x ?? 0) - NODE_WIDTH / 2, y: (pos?.y ?? 0) - NODE_HEIGHT / 2 },
      data: node.data,
    };
  });
}
