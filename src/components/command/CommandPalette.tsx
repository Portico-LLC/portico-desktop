import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import type { Client, Project, Task, Invoice } from '@/lib/types';
import { Search, Plus, Users, Briefcase, CheckSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const itemClass = cn(
  'flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm text-ink-700 transition-colors',
  'data-[selected=true]:bg-brass-50 data-[selected=true]:text-ink-900',
  'cursor-pointer'
);

/**
 * Client-side fuzzy search over already-fetched Clients/Projects/Tasks/Invoices — no new
 * backend endpoint (see Phase 3 plan: this app's scale makes a search index unnecessary,
 * and it keeps the "no external API" constraint trivially true). Unmounting when closed
 * (Radix Dialog's default) is what makes these queries fetch lazily on first open rather
 * than needing an explicit `enabled` flag.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const isClient = role === 'client';

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command loop className="flex max-h-[70vh] flex-col overflow-hidden rounded-md">
          <div className="flex items-center gap-2.5 border-b border-ink-200 px-4 py-3">
            <Search size={16} className="flex-shrink-0 text-ink-400" />
            <Command.Input
              autoFocus
              placeholder={isClient ? 'Search projects, tasks, invoices…' : 'Search or jump to anything…'}
              className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          <Command.List className="flex-1 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-ink-400">No results.</Command.Empty>

            {!isClient && (
              <Command.Group heading="Quick actions" className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-400">
                <Command.Item className={itemClass} onSelect={() => go('/tasks?new=1')}>
                  <Plus size={15} className="text-ink-400" /> New task
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go('/projects?new=1')}>
                  <Plus size={15} className="text-ink-400" /> New project
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go('/invoices?new=1')}>
                  <Plus size={15} className="text-ink-400" /> New invoice
                </Command.Item>
                <Command.Item className={itemClass} onSelect={() => go('/clients?new=1')}>
                  <Plus size={15} className="text-ink-400" /> New client
                </Command.Item>
              </Command.Group>
            )}

            {isClient ? <ClientResults onSelect={go} /> : <StudioResults onSelect={go} />}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const groupClass =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-400';

function StudioResults({ onSelect }: { onSelect: (path: string) => void }) {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients').then((res) => res.data),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').then((res) => res.data),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<Invoice[]>('/invoices').then((res) => res.data),
  });

  return (
    <>
      <Command.Group heading="Clients" className={cn('mb-1', groupClass)}>
        {clients.map((c) => (
          <Command.Item key={c.id} value={`client ${c.name} ${c.company ?? ''}`} className={itemClass} onSelect={() => onSelect('/clients')}>
            <Users size={15} className="text-ink-400" />
            <span className="truncate">{c.name}</span>
            {c.company && <span className="truncate text-ink-400">— {c.company}</span>}
          </Command.Item>
        ))}
      </Command.Group>
      <Command.Group heading="Projects" className={cn('mb-1', groupClass)}>
        {projects.map((p) => (
          <Command.Item key={p.id} value={`project ${p.name}`} className={itemClass} onSelect={() => onSelect('/projects')}>
            <Briefcase size={15} className="text-ink-400" />
            <span className="truncate">{p.name}</span>
          </Command.Item>
        ))}
      </Command.Group>
      <Command.Group heading="Tasks" className={cn('mb-1', groupClass)}>
        {tasks.map((t) => (
          <Command.Item key={t.id} value={`task ${t.title}`} className={itemClass} onSelect={() => onSelect(`/tasks?task=${t.id}`)}>
            <CheckSquare size={15} className="text-ink-400" />
            <span className="truncate">{t.title}</span>
          </Command.Item>
        ))}
      </Command.Group>
      <Command.Group heading="Invoices" className={groupClass}>
        {invoices.map((inv) => (
          <Command.Item
            key={inv.id}
            value={`invoice ${inv.invoiceNumber} ${inv.client?.name ?? ''}`}
            className={itemClass}
            onSelect={() => onSelect('/invoices')}
          >
            <FileText size={15} className="text-ink-400" />
            <span className="truncate">{inv.invoiceNumber}</span>
            {inv.client?.name && <span className="truncate text-ink-400">— {inv.client.name}</span>}
          </Command.Item>
        ))}
      </Command.Group>
    </>
  );
}

function ClientResults({ onSelect }: { onSelect: (path: string) => void }) {
  const { data: projects = [] } = useQuery({
    queryKey: ['client', 'projects'],
    queryFn: () => api.get<Project[]>('/client/projects').then((res) => res.data),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['client', 'tasks'],
    queryFn: () => api.get<Task[]>('/client/tasks').then((res) => res.data),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['client', 'invoices'],
    queryFn: () => api.get<Invoice[]>('/client/invoices').then((res) => res.data),
  });

  return (
    <>
      <Command.Group heading="Projects" className={cn('mb-1', groupClass)}>
        {projects.map((p) => (
          <Command.Item key={p.id} value={`project ${p.name}`} className={itemClass} onSelect={() => onSelect(`/portal/projects/${p.id}`)}>
            <Briefcase size={15} className="text-ink-400" />
            <span className="truncate">{p.name}</span>
          </Command.Item>
        ))}
      </Command.Group>
      <Command.Group heading="Tasks" className={cn('mb-1', groupClass)}>
        {tasks.map((t) => (
          <Command.Item key={t.id} value={`task ${t.title}`} className={itemClass} onSelect={() => onSelect('/portal/tasks')}>
            <CheckSquare size={15} className="text-ink-400" />
            <span className="truncate">{t.title}</span>
          </Command.Item>
        ))}
      </Command.Group>
      <Command.Group heading="Invoices" className={groupClass}>
        {invoices.map((inv) => (
          <Command.Item key={inv.id} value={`invoice ${inv.invoiceNumber}`} className={itemClass} onSelect={() => onSelect('/portal/invoices')}>
            <FileText size={15} className="text-ink-400" />
            <span className="truncate">{inv.invoiceNumber}</span>
          </Command.Item>
        ))}
      </Command.Group>
    </>
  );
}
