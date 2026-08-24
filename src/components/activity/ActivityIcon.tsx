import type { LucideIcon } from 'lucide-react';
import { CheckSquare, Briefcase, FileText, MessageSquare, Workflow } from 'lucide-react';
import type { ActivityEventType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ActivityStyleMeta {
  icon: LucideIcon;
  bg: string;
  text: string;
}

// Same category-color convention as components/automations/automationNodeStyles.ts:
// pine/steel for structural (task/project) work, brass for money, moss for messages,
// steel for automation/system activity.
const STYLES: Record<ActivityEventType, ActivityStyleMeta> = {
  task_created: { icon: CheckSquare, bg: 'bg-pine-500/10', text: 'text-pine-700' },
  task_updated: { icon: CheckSquare, bg: 'bg-pine-500/10', text: 'text-pine-700' },
  project_created: { icon: Briefcase, bg: 'bg-pine-500/10', text: 'text-pine-700' },
  project_updated: { icon: Briefcase, bg: 'bg-pine-500/10', text: 'text-pine-700' },
  invoice_created: { icon: FileText, bg: 'bg-brass-500/10', text: 'text-brass-700' },
  invoice_status_changed: { icon: FileText, bg: 'bg-brass-500/10', text: 'text-brass-700' },
  client_message_received: { icon: MessageSquare, bg: 'bg-moss-500/10', text: 'text-moss-600' },
  automation_run_completed: { icon: Workflow, bg: 'bg-steel-500/10', text: 'text-steel-600' },
};

export function ActivityIcon({ type, className }: { type: ActivityEventType; className?: string }) {
  const { icon: Icon, bg, text } = STYLES[type];
  return (
    <span className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm', bg, text, className)}>
      <Icon size={15} />
    </span>
  );
}
