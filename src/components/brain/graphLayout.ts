import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { BrainGraphData, BrainGraphNode } from '@/lib/types';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

export function layoutGraph(data: BrainGraphData): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 96 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of data.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of data.edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = data.nodes.map((n: BrainGraphNode) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'brainNode',
      position: { x: (pos?.x ?? 0) - NODE_WIDTH / 2, y: (pos?.y ?? 0) - NODE_HEIGHT / 2 },
      data: { label: n.label, nodeType: n.type, meta: n.meta },
    };
  });

  const edges: Edge[] = data.edges
    .filter((e) => data.nodes.some((n) => n.id === e.source) && data.nodes.some((n) => n.id === e.target))
    .map((e) => ({
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      style: { stroke: 'var(--edge-color, #c6c0b0)', strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}
