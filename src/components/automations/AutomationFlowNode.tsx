import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { AlertTriangle, X } from 'lucide-react';
import type { WorkflowNodeType } from '@/lib/types';
import { NODE_STYLES } from './automationNodeStyles';

export interface AutomationNodeData {
  label: string;
  nodeType: WorkflowNodeType;
  destructiveAck?: boolean;
  summary?: string;
  [key: string]: unknown;
}

const HANDLE_CLASS = '!h-2 !w-2 !border-none !bg-ink-300';

function AutomationFlowNodeComponent({ id, data, selected }: { id: string; data: AutomationNodeData; selected?: boolean }) {
  const style = NODE_STYLES[data.nodeType];
  const Icon = style.icon;
  const isTrigger = style.category === 'trigger';
  const isIf = data.nodeType === 'logic.if';
  const needsAck = style.destructive && !data.destructiveAck;
  const { deleteElements } = useReactFlow();

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-md border bg-bone-50/95 px-3 py-2 shadow-xs backdrop-blur-sm transition-all duration-hover ease-brand ${style.border} ${
        selected ? 'ring-2 ring-brass-400' : ''
      } ${needsAck ? 'border-l-4 border-l-terracotta-500' : ''}`}
      style={{ width: 210 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          void deleteElements({ nodes: [{ id }] });
        }}
        title="Delete step"
        className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-ink-200 bg-bone-50 text-ink-400 opacity-0 shadow-sm transition-opacity duration-hover ease-brand hover:bg-terracotta-500 hover:text-bone-50 group-hover:opacity-100"
      >
        <X size={11} />
      </button>

      {!isTrigger && <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />}

      <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm ${style.bg} ${style.text}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink-900">{data.label || style.label}</p>
        <p className="truncate text-[10px] text-ink-400">{data.summary || style.label}</p>
      </div>
      {needsAck && <AlertTriangle size={13} className="flex-shrink-0 text-terracotta-500" />}

      {isIf ? (
        <>
          <Handle type="source" position={Position.Right} id="true" style={{ top: '35%' }} className={`${HANDLE_CLASS} !bg-moss-500`} />
          <Handle type="source" position={Position.Right} id="false" style={{ top: '65%' }} className={`${HANDLE_CLASS} !bg-terracotta-500`} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
      )}
    </div>
  );
}

export const AutomationFlowNode = memo(AutomationFlowNodeComponent);
