import { Briefcase, CheckSquare, MessageSquare, FileStack, Shield, CalendarDays, Workflow, Brain, FileText, LayoutTemplate, Gamepad2, Gauge, Sparkles } from 'lucide-react';
import { COMPANY_MODULES, type CompanyModule } from '@/lib/types';

export { COMPANY_MODULES };

export const MODULE_META: Record<CompanyModule, { label: string; icon: React.ReactNode }> = {
  projects: { label: 'Projects', icon: <Briefcase size={16} /> },
  tasks: { label: 'Tasks', icon: <CheckSquare size={16} /> },
  teamChat: { label: 'Team Chat', icon: <MessageSquare size={16} /> },
  documents: { label: 'Documents', icon: <FileStack size={16} /> },
  vault: { label: 'Vault', icon: <Shield size={16} /> },
  calendar: { label: 'Calendar', icon: <CalendarDays size={16} /> },
  automations: { label: 'Automations', icon: <Workflow size={16} /> },
  brain: { label: 'Brain', icon: <Brain size={16} /> },
  invoices: { label: 'Invoices', icon: <FileText size={16} /> },
  projectTemplates: { label: 'Templates', icon: <LayoutTemplate size={16} /> },
  games: { label: 'Arcade', icon: <Gamepad2 size={16} /> },
  radar: { label: 'Radar', icon: <Gauge size={16} /> },
  steward: { label: 'Steward', icon: <Sparkles size={16} /> },
};
