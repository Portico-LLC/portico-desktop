import { NODE_PALETTE, NODE_STYLES } from './automationNodeStyles';
import { cn } from '@/lib/utils';
import type { WorkflowNodeType } from '@/lib/types';

export const DRAG_DATA_TYPE = 'application/portico-automation-node';

export function NodePalette({ hasTrigger }: { hasTrigger: boolean }) {
  const onDragStart = (event: React.DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData(DRAG_DATA_TYPE, nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-r border-ink-200 bg-bone-50">
      <div className="border-b border-ink-200 px-4 py-3">
        <p className="text-sm font-medium text-ink-900">Steps</p>
        <p className="text-xs text-ink-400">Drag onto the canvas</p>
      </div>
      {NODE_PALETTE.map((group) => (
        <div key={group.category} className="border-b border-ink-100 px-3 py-3">
          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">{group.label}</p>
          <div className="space-y-1.5">
            {group.types.map((type) => {
              const meta = NODE_STYLES[type];
              const Icon = meta.icon;
              const disabled = group.category === 'trigger' && hasTrigger;
              return (
                <div
                  key={type}
                  draggable={!disabled}
                  onDragStart={(e) => !disabled && onDragStart(e, type)}
                  title={disabled ? 'This workflow already has a trigger' : meta.description}
                  className={cn(
                    'flex items-center gap-2 rounded-sm border bg-bone-50 px-2.5 py-2 text-xs transition-all duration-hover ease-brand',
                    meta.border,
                    disabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab hover:shadow-sm hover:-translate-y-px active:cursor-grabbing',
                  )}
                >
                  <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm', meta.bg, meta.text)}>
                    <Icon size={13} />
                  </span>
                  <span className="truncate font-medium text-ink-800">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
