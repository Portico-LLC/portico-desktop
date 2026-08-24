import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Briefcase, CheckSquare, FileText, MessageSquare, UserCog } from 'lucide-react';
import type { BrainGraphNodeType } from '@/lib/types';

const TYPE_STYLES: Record<BrainGraphNodeType, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
  client: { icon: <Users size={14} />, bg: 'bg-steel-500/10', text: 'text-steel-600', border: 'border-steel-400/40' },
  project: { icon: <Briefcase size={14} />, bg: 'bg-pine-500/10', text: 'text-pine-700', border: 'border-pine-400/40' },
  task: {
    icon: <CheckSquare size={14} />,
    bg: 'bg-brass-500/10',
    text: 'text-brass-700',
    border: 'border-brass-400/40',
  },
  invoice: {
    icon: <FileText size={14} />,
    bg: 'bg-ochre-500/10',
    text: 'text-ochre-600',
    border: 'border-ochre-400/40',
  },
  conversation: {
    icon: <MessageSquare size={14} />,
    bg: 'bg-moss-500/10',
    text: 'text-moss-600',
    border: 'border-moss-400/40',
  },
  employee: {
    icon: <UserCog size={14} />,
    bg: 'bg-terracotta-500/10',
    text: 'text-terracotta-600',
    border: 'border-terracotta-400/40',
  },
};

export interface BrainNodeData {
  label: string;
  nodeType: BrainGraphNodeType;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

function subtitle(nodeType: BrainGraphNodeType, meta?: Record<string, unknown>): string | undefined {
  if (!meta) return undefined;
  if (nodeType === 'task' || nodeType === 'project' || nodeType === 'invoice') {
    return typeof meta.status === 'string' ? meta.status.replace(/-/g, ' ') : undefined;
  }
  return undefined;
}

function BrainGraphNodeComponent({ data, selected }: { data: BrainNodeData; selected?: boolean }) {
  const style = TYPE_STYLES[data.nodeType];
  const sub = subtitle(data.nodeType, data.meta);
  return (
    <div
      className={`flex items-center gap-2 rounded-md border bg-bone-50/95 px-3 py-2 shadow-xs backdrop-blur-sm transition-all duration-hover ease-brand ${style.border} ${
        selected ? 'ring-2 ring-brass-400' : ''
      }`}
      style={{ width: 200 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-ink-300 !border-none !h-1.5 !w-1.5" />
      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm ${style.bg} ${style.text}`}>
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink-900">{data.label}</p>
        {sub && <p className="truncate text-[10px] capitalize text-ink-400">{sub}</p>}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-ink-300 !border-none !h-1.5 !w-1.5" />
    </div>
  );
}

export const BrainFlowNode = memo(BrainGraphNodeComponent);
