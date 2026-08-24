import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { BrainGraphData } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Network, LayoutGrid } from 'lucide-react';
import { layoutGraph } from './graphLayout';
import { BrainFlowNode, type BrainNodeData } from './BrainGraphNode';

const nodeTypes = { brainNode: BrainFlowNode };

function positionsStorageKey(userId: string | undefined, portal: boolean): string {
  return `portico_brain_graph_positions:${userId ?? 'anon'}:${portal ? 'portal' : 'studio'}`;
}

function loadSavedPositions(key: string): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function BrainGraph({ portal = false }: { portal?: boolean }) {
  const path = portal ? '/client/brain/graph' : '/brain/graph';
  const userId = useAuthStore((s) => s.user?.id);
  const storageKey = positionsStorageKey(userId, portal);

  const { data, isLoading } = useQuery({
    queryKey: ['brain-graph', portal],
    queryFn: () => api.get<BrainGraphData>(path).then((res) => res.data),
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const layoutNodeIds = useRef<string>('');

  // Re-run the auto-layout only when the underlying graph's node/edge set actually
  // changes (not on every refetch) — a saved manual position always wins for a
  // node that already had one, so dragging survives background refreshes.
  useEffect(() => {
    if (!data) return;
    const nodeIdsKey = data.nodes.map((n) => n.id).sort().join(',');
    if (nodeIdsKey === layoutNodeIds.current && nodes.length > 0) return;
    layoutNodeIds.current = nodeIdsKey;

    const saved = loadSavedPositions(storageKey);
    const { nodes: laidOut, edges: laidOutEdges } = layoutGraph(data);
    setNodes(laidOut.map((n) => (saved[n.id] ? { ...n, position: saved[n.id] } : n)));
    setEdges(laidOutEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, storageKey]);

  const handleNodeDragStop = (_event: unknown, _node: Node, draggedNodes: Node[]) => {
    const saved = loadSavedPositions(storageKey);
    for (const n of draggedNodes) saved[n.id] = n.position;
    localStorage.setItem(storageKey, JSON.stringify(saved));
  };

  const resetLayout = () => {
    if (!data) return;
    localStorage.removeItem(storageKey);
    const { nodes: laidOut, edges: laidOutEdges } = layoutGraph(data);
    setNodes(laidOut);
    setEdges(laidOutEdges);
  };

  if (isLoading) {
    return (
      <Card className="flex h-[calc(100vh-260px)] min-h-[480px] items-center justify-center text-sm text-ink-400">
        Loading graph…
      </Card>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card className="flex h-[calc(100vh-260px)] min-h-[480px] flex-col items-center justify-center text-center px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pine-800 text-bone-50">
          <Network size={22} />
        </div>
        <h3 className="font-display text-lg font-medium text-ink-900 mb-1">Nothing to visualize yet</h3>
        <p className="text-sm text-ink-500 max-w-sm">
          {portal
            ? 'Once your studio adds projects, tasks, or invoices, they’ll show up here linked together.'
            : 'Add clients, projects, tasks, or invoices and this graph will map how everything connects.'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative h-[calc(100vh-260px)] min-h-[480px]">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={handleNodeDragStop}
            onNodeClick={(_e, node) => setSelected(node)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background color="#c6c0b0" gap={20} size={1} />
            <Controls showInteractive={false} className="!shadow-md" />
            <MiniMap
              pannable
              zoomable
              className="!bg-bone-50 !border !border-ink-200"
              nodeColor={() => '#8FBCA6'}
              maskColor="rgba(28, 27, 23, 0.06)"
            />
          </ReactFlow>
        </ReactFlowProvider>
        <Button
          variant="secondary"
          size="sm"
          onClick={resetLayout}
          className="!absolute right-3 top-3 z-10 shadow-sm"
          title="Reset to the automatic layout"
        >
          <LayoutGrid size={14} />
          Reset Layout
        </Button>
      </div>

      <NodeDetailDialog node={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}

function NodeDetailDialog({ node, onClose }: { node: Node | null; onClose: () => void }) {
  const data = node?.data as BrainNodeData | undefined;
  return (
    <Dialog open={!!node} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{data?.label ?? ''}</DialogTitle>
        </DialogHeader>
        {data && (
          <div className="space-y-3">
            <Badge variant="outline" className="capitalize">
              {data.nodeType}
            </Badge>
            {data.meta && (
              <dl className="space-y-1.5 text-sm">
                {Object.entries(data.meta)
                  .filter(([key]) => key !== 'entityId')
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-4 border-b border-ink-100 pb-1.5">
                      <dt className="capitalize text-ink-400">{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className="font-medium text-ink-900 truncate">{String(value ?? '—')}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
