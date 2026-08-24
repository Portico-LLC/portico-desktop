import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAutomationsStore } from '@/store/automations';
import { AutomationToolbar } from '@/components/automations/AutomationToolbar';
import { AutomationCanvas } from '@/components/automations/AutomationCanvas';
import { NodeConfigPanel } from '@/components/automations/NodeConfigPanel';
import { RunHistoryPanel } from '@/components/automations/RunHistoryPanel';

export function AutomationBuilder() {
  const { id } = useParams<{ id: string }>();
  const workflow = useAutomationsStore((s) => s.workflow);
  const isLoading = useAutomationsStore((s) => s.isLoading);
  const loadWorkflow = useAutomationsStore((s) => s.loadWorkflow);
  const reset = useAutomationsStore((s) => s.reset);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (id) loadWorkflow(id);
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading || !workflow) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center text-sm text-ink-400">Loading automation…</div>
    );
  }

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    // Fixed to the viewport minus TopBar's h-14 (56px), same reasoning as BrainGraph's
    // h-[calc(100vh-260px)] — a canvas that needs to fill the screen can't rely on a
    // flex-1/h-full cascade through Layout's overflow-auto Outlet wrapper; that chain
    // silently collapses to content-size (0) instead of stretching in some browsers.
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <AutomationToolbar
        historyOpen={historyOpen}
        onToggleHistory={() => {
          setHistoryOpen((v) => !v);
          setSelectedNodeId(null);
        }}
        onRan={() => setHistoryOpen(true)}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AutomationCanvas
          onSelectNode={(nodeId) => {
            setSelectedNodeId(nodeId);
            if (nodeId) setHistoryOpen(false);
          }}
        />
        {selectedNode && !historyOpen && <NodeConfigPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />}
        {historyOpen && <RunHistoryPanel workflowId={workflow.id} onClose={() => setHistoryOpen(false)} />}
      </div>
    </div>
  );
}
