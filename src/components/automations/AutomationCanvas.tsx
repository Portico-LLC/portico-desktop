import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAutomationsStore } from '@/store/automations';
import { AutomationFlowNode, type AutomationNodeData } from './AutomationFlowNode';
import { NodePalette, DRAG_DATA_TYPE } from './NodePalette';
import { NODE_STYLES } from './automationNodeStyles';
import type { WorkflowNodeConfig, WorkflowEdgeConfig, WorkflowNodeType } from '@/lib/types';

const nodeTypes = { automationNode: AutomationFlowNode };
const EDGE_STYLE = { stroke: '#c6c0b0', strokeWidth: 1.5 };

function branchLabel(sourceHandle: string | null | undefined): string | undefined {
  if (sourceHandle === 'true') return 'Yes';
  if (sourceHandle === 'false') return 'No';
  return undefined;
}

function summarize(node: WorkflowNodeConfig): string {
  const c = node.data.config ?? {};
  switch (node.type) {
    case 'trigger.cron':
      return String(c.cronExpression || 'Not scheduled yet');
    case 'trigger.event':
      return `${c.entityType ?? ''} · ${c.eventName ?? ''}`.trim() || 'No event selected';
    case 'trigger.manual':
      return 'Runs on demand';
    case 'logic.if': {
      const cond = c.condition as { left?: string; op?: string; right?: string } | undefined;
      return cond?.left ? `${cond.left} ${cond.op ?? ''} ${cond.right ?? ''}`.trim() : 'No condition set';
    }
    case 'logic.delay':
      return `Wait ${c.seconds ?? 0}s`;
    case 'logic.forEach':
      return String(c.listExpression || 'No list set');
    case 'logic.setVariable':
      return `${((c.assignments as unknown[]) ?? []).length} variable(s)`;
    case 'logic.merge':
      return 'Waits for all branches';
    case 'action.createTask':
      return String(c.title || 'Untitled task');
    case 'action.updateTask':
    case 'action.deleteTask':
      return String(c.taskId || 'No task selected');
    case 'action.createProject':
      return String(c.name || 'Untitled project');
    case 'action.updateProject':
    case 'action.deleteProject':
      return String(c.projectId || 'No project selected');
    case 'action.createInvoice':
      return 'New invoice';
    case 'action.updateInvoiceStatus':
      return `${c.invoiceId || '—'} → ${c.status ?? ''}`;
    case 'action.deleteInvoice':
      return String(c.invoiceId || 'No invoice selected');
    case 'action.sendClientMessage':
    case 'action.sendTeamChannelMessage':
      return String(c.body || 'No message');
    case 'action.notifyEmployee':
      return String(c.title || 'No title');
    default:
      return '';
  }
}

function toFlowNode(n: WorkflowNodeConfig): Node {
  return {
    id: n.id,
    type: 'automationNode',
    position: n.position,
    data: { label: n.data.label, nodeType: n.type, destructiveAck: n.data.destructiveAck, summary: summarize(n) } as AutomationNodeData,
  };
}

function toFlowEdge(e: WorkflowEdgeConfig): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    type: 'smoothstep',
    label: branchLabel(e.sourceHandle),
    style: EDGE_STYLE,
  };
}

function AutomationCanvasInner({ onSelectNode }: { onSelectNode: (nodeId: string | null) => void }) {
  const workflow = useAutomationsStore((s) => s.workflow);
  const setNodesStore = useAutomationsStore((s) => s.setNodes);
  const setEdgesStore = useAutomationsStore((s) => s.setEdges);

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState<Edge>([]);
  const loadedWorkflowId = useRef<string | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (!workflow || loadedWorkflowId.current === workflow.id) return;
    loadedWorkflowId.current = workflow.id;
    setNodes(workflow.nodes.map(toFlowNode));
    setEdges(workflow.edges.map(toFlowEdge));
  }, [workflow, setNodes, setEdges]);

  // Keep node/edge labels and presence in sync when the config panel edits or deletes a node,
  // without disturbing the positions of nodes that are still there.
  useEffect(() => {
    if (!workflow || loadedWorkflowId.current !== workflow.id) return;
    const storeNodeIds = new Set(workflow.nodes.map((n) => n.id));
    setNodes((current) =>
      current
        .filter((n) => storeNodeIds.has(n.id))
        .map((n) => {
          const src = workflow.nodes.find((wn) => wn.id === n.id);
          if (!src) return n;
          const data: AutomationNodeData = {
            label: src.data.label,
            nodeType: src.type,
            destructiveAck: src.data.destructiveAck,
            summary: summarize(src),
          };
          return { ...n, data };
        }),
    );
    const storeEdgeIds = new Set(workflow.edges.map((e) => e.id));
    setEdges((current) => current.filter((e) => storeEdgeIds.has(e.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.nodes, workflow?.edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);
      const removals = changes.filter((c): c is Extract<NodeChange, { type: 'remove' }> => c.type === 'remove');
      if (removals.length) {
        const removedIds = new Set(removals.map((c) => c.id));
        setNodesStore((workflow?.nodes ?? []).filter((n) => !removedIds.has(n.id)));
        setEdgesStore((workflow?.edges ?? []).filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)));
      }
      const settled = changes.filter(
        (c): c is Extract<NodeChange, { type: 'position' }> => c.type === 'position' && c.dragging === false && !!c.position,
      );
      if (settled.length) {
        setNodesStore(
          (workflow?.nodes ?? []).map((n) => {
            const change = settled.find((c) => c.id === n.id);
            return change?.position ? { ...n, position: change.position } : n;
          }),
        );
      }
    },
    [onNodesChangeInternal, setNodesStore, setEdgesStore, workflow],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);
      const removedIds = changes.filter((c): c is Extract<EdgeChange, { type: 'remove' }> => c.type === 'remove').map((c) => c.id);
      if (removedIds.length) {
        setEdgesStore((workflow?.edges ?? []).filter((e) => !removedIds.includes(e.id)));
      }
    },
    [onEdgesChangeInternal, setEdgesStore, workflow],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const id = `e-${connection.source}-${connection.target}-${connection.sourceHandle ?? 'default'}-${Date.now()}`;
      setEdges((eds) => addEdge({ ...connection, id, type: 'smoothstep', label: branchLabel(connection.sourceHandle), style: EDGE_STYLE }, eds));
      const newEdge: WorkflowEdgeConfig = {
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
      };
      setEdgesStore([...(workflow?.edges ?? []), newEdge]);
    },
    [setEdges, setEdgesStore, workflow],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData(DRAG_DATA_TYPE) as WorkflowNodeType;
      const meta = NODE_STYLES[nodeType];
      if (!meta) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = crypto.randomUUID();
      const newStoreNode: WorkflowNodeConfig = {
        id,
        type: nodeType,
        position,
        data: { label: meta.label, config: structuredClone(meta.defaultConfig) },
      };
      setNodesStore([...(workflow?.nodes ?? []), newStoreNode]);
      setNodes((nds) => [...nds, toFlowNode(newStoreNode)]);
      onSelectNode(id);
    },
    [screenToFlowPosition, setNodesStore, setNodes, workflow, onSelectNode],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const hasTrigger = (workflow?.nodes ?? []).some((n) => n.type.startsWith('trigger.'));

  return (
    <div className="flex h-full w-full min-h-0 min-w-0">
      <NodePalette hasTrigger={hasTrigger} />
      <div className="relative min-w-0 flex-1" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_e, node) => onSelectNode(node.id)}
          onPaneClick={() => onSelectNode(null)}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          minZoom={0.2}
        >
          <Background color="#c6c0b0" gap={20} size={1} />
          <Controls showInteractive={false} className="!shadow-md" />
          <MiniMap pannable zoomable className="!border !border-ink-200 !bg-bone-50" nodeColor={() => '#8FBCA6'} maskColor="rgba(28, 27, 23, 0.06)" />
        </ReactFlow>
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-ink-400">Drag a trigger from the left panel to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AutomationCanvas(props: { onSelectNode: (nodeId: string | null) => void }) {
  return (
    // AutomationCanvasInner's own root div has no flex-grow of its own, so as a plain flex
    // child of the builder page's row it would size to content instead of filling the
    // remaining width — this wrapper is what actually claims that space (h-full + flex-1),
    // which is what React Flow's own width/height measurement (error #004) depends on.
    <div className="h-full min-h-0 min-w-0 flex-1">
      <ReactFlowProvider>
        <AutomationCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
