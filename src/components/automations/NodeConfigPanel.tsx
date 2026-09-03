import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAutomationsStore } from '@/store/automations';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { NODE_STYLES } from './automationNodeStyles';
import type {
  WorkflowNodeConfig,
  WorkflowTriggerConfig,
  ExpressionCondition,
  ExpressionOp,
  AutomationEntityType,
  AutomationEventName,
} from '@/lib/types';

interface RefOption {
  id: string;
  name: string;
}

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily 9am', value: '0 9 * * *' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'Every 15 min', value: '*/15 * * * *' },
];

const EVENTS_BY_ENTITY: Record<AutomationEntityType, AutomationEventName[]> = {
  task: ['task.created', 'task.updated'],
  project: ['project.created', 'project.updated', 'project.riskThresholdCrossed'],
  invoice: ['invoice.created', 'invoice.statusChanged'],
  client: [],
  message: ['client.messageReceived'],
  employee: ['employee.overCapacity'],
};

const OPS: { value: ExpressionOp; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'gt', label: 'is greater than' },
  { value: 'lt', label: 'is less than' },
  { value: 'gte', label: 'is at least' },
  { value: 'lte', label: 'is at most' },
  { value: 'contains', label: 'contains' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
];

function useRefOptions() {
  const clients = useQuery({
    queryKey: ['automations-ref', 'clients'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/clients').then((r) => r.data),
  });
  const projects = useQuery({
    queryKey: ['automations-ref', 'projects'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/projects').then((r) => r.data),
  });
  const tasks = useQuery({
    queryKey: ['automations-ref', 'tasks'],
    queryFn: () => api.get<{ id: string; title: string }[]>('/tasks').then((r) => r.data),
  });
  const invoices = useQuery({
    queryKey: ['automations-ref', 'invoices'],
    queryFn: () => api.get<{ id: string; invoiceNumber: string }[]>('/invoices').then((r) => r.data),
  });
  const employees = useQuery({
    queryKey: ['automations-ref', 'employees'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/employees').then((r) => r.data),
  });
  const channels = useQuery({
    queryKey: ['automations-ref', 'channels'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/team-chat/channels').then((r) => r.data),
  });
  const conversations = useQuery({
    queryKey: ['automations-ref', 'conversations'],
    queryFn: () => api.get<{ id: string; title?: string; client?: { name: string } }[]>('/conversations').then((r) => r.data),
  });

  return {
    clients: (clients.data ?? []).map((c): RefOption => ({ id: c.id, name: c.name })),
    projects: (projects.data ?? []).map((p): RefOption => ({ id: p.id, name: p.name })),
    tasks: (tasks.data ?? []).map((t): RefOption => ({ id: t.id, name: t.title })),
    invoices: (invoices.data ?? []).map((i): RefOption => ({ id: i.id, name: i.invoiceNumber })),
    employees: (employees.data ?? []).map((e): RefOption => ({ id: e.id, name: e.name })),
    channels: (channels.data ?? []).map((c): RefOption => ({ id: c.id, name: c.name || 'Channel' })),
    conversations: (conversations.data ?? []).map((c): RefOption => ({ id: c.id, name: c.title || c.client?.name || 'Conversation' })),
  };
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function ExpressionField({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <FieldGroup>
      <Label>
        {label}
        {required && <span className="text-terracotta-500"> *</span>}
      </Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? '{{trigger...}} or plain text'} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? '{{trigger...}} or plain text'} />
      )}
    </FieldGroup>
  );
}

/** A date field that defaults to a real calendar picker (its value is a plain
 *  YYYY-MM-DD string, which the run-time template resolver already passes
 *  through unchanged) but can switch to a raw `{{...}}` expression for
 *  workflow authors who want a dynamic value like `{{now}}` or
 *  `{{addDays trigger.task.dueDate 3}}`. */
function DateExpressionField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const looksLikeExpression = value.includes('{{');
  const [mode, setMode] = useState<'date' | 'expression'>(looksLikeExpression ? 'expression' : 'date');
  const datePart = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';

  return (
    <FieldGroup>
      <div className="flex items-center justify-between">
        <Label>
          {label}
          {required && <span className="text-terracotta-500"> *</span>}
        </Label>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'date' ? 'expression' : 'date'))}
          className="text-xs text-ink-400 transition-colors duration-hover ease-brand hover:text-ink-700"
        >
          {mode === 'date' ? 'Use expression' : 'Use calendar'}
        </button>
      </div>
      {mode === 'date' ? (
        <Input type="date" value={datePart} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="{{now}} or {{addDays trigger.task.dueDate 3}}" />
      )}
    </FieldGroup>
  );
}

function IdPickerField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: RefOption[];
  required?: boolean;
}) {
  return (
    <FieldGroup>
      <Label>
        {label}
        {required && <span className="text-terracotta-500"> *</span>}
      </Label>
      {options.length > 0 && (
        <Select
          value=""
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        >
          <option value="">Pick from list…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      )}
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="ID or {{expression}}" />
    </FieldGroup>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <FieldGroup>
      <Label>{label}</Label>
      <Input type="number" min={min} max={max} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
    </FieldGroup>
  );
}

function ConditionEditor({ condition, onChange }: { condition: ExpressionCondition; onChange: (c: ExpressionCondition) => void }) {
  const needsRight = condition.op !== 'isEmpty' && condition.op !== 'isNotEmpty';
  return (
    <div className="space-y-2 rounded-sm border border-ink-200 bg-ink-50 p-3">
      <ExpressionField label="Left side" value={condition.left} onChange={(v) => onChange({ ...condition, left: v })} placeholder="{{trigger.task.status}}" />
      <FieldGroup>
        <Label>Comparison</Label>
        <Select value={condition.op} onChange={(e) => onChange({ ...condition, op: e.target.value as ExpressionOp })}>
          {OPS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </FieldGroup>
      {needsRight && (
        <ExpressionField label="Right side" value={condition.right ?? ''} onChange={(v) => onChange({ ...condition, right: v })} placeholder="done" />
      )}
    </div>
  );
}

export function NodeConfigPanel({ node, onClose }: { node: WorkflowNodeConfig; onClose: () => void }) {
  const updateNodeData = useAutomationsStore((s) => s.updateNodeData);
  const deleteNode = useAutomationsStore((s) => s.deleteNode);
  const workflow = useAutomationsStore((s) => s.workflow);
  const setTrigger = useAutomationsStore((s) => s.setTrigger);
  const refs = useRefOptions();
  const meta = NODE_STYLES[node.type];
  const Icon = meta.icon;
  const config = node.data.config ?? {};

  // The trigger node's config (inside `nodes[]`) and `Workflow.trigger` (a separate top-level
  // column the scheduler/event-listener actually read) are two different fields — nothing else
  // in this file kept them in sync, so a cron/event trigger configured here silently never fired.
  const setConfig = (patch: Record<string, unknown>) => {
    const merged = { ...config, ...patch };
    updateNodeData(node.id, { config: merged });
    if (node.type.startsWith('trigger.')) {
      setTrigger({ type: node.type, ...merged } as WorkflowTriggerConfig);
    }
  };
  const setLabel = (label: string) => updateNodeData(node.id, { label });
  const setAck = (ack: boolean) => updateNodeData(node.id, { destructiveAck: ack });
  const handleDelete = () => {
    deleteNode(node.id);
    onClose();
  };

  return (
    <div key={node.id} className="flex h-full w-80 flex-shrink-0 flex-col overflow-y-auto border-l border-ink-200 bg-bone-50">
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm ${meta.bg} ${meta.text}`}>
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">{meta.label}</p>
            <p className="truncate text-[11px] text-ink-400">{meta.description}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            onClick={handleDelete}
            title="Delete step"
            className="rounded-sm p-1 text-ink-400 transition-colors hover:bg-terracotta-100 hover:text-terracotta-600"
          >
            <Trash2 size={15} />
          </button>
          <button onClick={onClose} className="rounded-sm p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <FieldGroup>
          <Label>Step name</Label>
          <Input value={node.data.label} onChange={(e) => setLabel(e.target.value)} placeholder={meta.label} />
        </FieldGroup>

        {meta.destructive && (
          <div className="space-y-2 rounded-sm border border-terracotta-300 bg-terracotta-500/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-terracotta-500" />
              <p className="text-xs text-terracotta-700">
                This step permanently deletes data and cannot be undone. Acknowledge to allow this workflow to be activated.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-terracotta-700">
              <input type="checkbox" checked={!!node.data.destructiveAck} onChange={(e) => setAck(e.target.checked)} />
              I understand this permanently deletes data
            </label>
          </div>
        )}

        {node.type === 'trigger.manual' && (
          <p className="text-sm text-ink-500">No configuration needed — run this workflow from the toolbar above whenever you like.</p>
        )}

        {node.type === 'trigger.cron' && (
          <>
            <FieldGroup>
              <Label>Cron expression</Label>
              <Input
                value={String(config.cronExpression ?? '')}
                onChange={(e) => setConfig({ cronExpression: e.target.value })}
                placeholder="0 9 * * *"
              />
            </FieldGroup>
            <div className="flex flex-wrap gap-1.5">
              {CRON_PRESETS.map((p) => (
                <Button key={p.value} type="button" variant="secondary" size="sm" onClick={() => setConfig({ cronExpression: p.value })}>
                  {p.label}
                </Button>
              ))}
            </div>
            <FieldGroup>
              <Label>Timezone (optional)</Label>
              <Input value={String(config.timezone ?? '')} onChange={(e) => setConfig({ timezone: e.target.value })} placeholder="America/New_York" />
            </FieldGroup>
          </>
        )}

        {node.type === 'trigger.event' && (
          <>
            <FieldGroup>
              <Label>When this happens</Label>
              <Select
                value={String(config.entityType ?? 'task')}
                onChange={(e) => {
                  const entityType = e.target.value as AutomationEntityType;
                  setConfig({ entityType, eventName: EVENTS_BY_ENTITY[entityType][0] ?? '' });
                }}
              >
                <option value="task">A task</option>
                <option value="project">A project</option>
                <option value="invoice">An invoice</option>
                <option value="message">A client message</option>
                <option value="employee">A team member</option>
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Event</Label>
              <Select value={String(config.eventName ?? '')} onChange={(e) => setConfig({ eventName: e.target.value })}>
                {(EVENTS_BY_ENTITY[(config.entityType as AutomationEntityType) ?? 'task'] ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </>
        )}

        {node.type === 'logic.if' && (
          <ConditionEditor
            condition={(config.condition as ExpressionCondition) ?? { left: '', op: 'eq', right: '' }}
            onChange={(c) => setConfig({ condition: c })}
          />
        )}

        {node.type === 'logic.delay' && (
          <>
            <NumberField label="Wait (seconds)" value={Number(config.seconds ?? 60)} min={1} max={3600} onChange={(v) => setConfig({ seconds: v })} />
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '1 min', v: 60 },
                { label: '5 min', v: 300 },
                { label: '1 hour', v: 3600 },
              ].map((p) => (
                <Button key={p.v} type="button" variant="secondary" size="sm" onClick={() => setConfig({ seconds: p.v })}>
                  {p.label}
                </Button>
              ))}
            </div>
          </>
        )}

        {node.type === 'logic.forEach' && (
          <>
            <ExpressionField
              label="List"
              value={String(config.listExpression ?? '')}
              onChange={(v) => setConfig({ listExpression: v })}
              placeholder="{{steps.list_tasks.output}}"
              required
            />
            <NumberField label="Max iterations" value={Number(config.maxIterations ?? 50)} min={1} max={500} onChange={(v) => setConfig({ maxIterations: v })} />
            <p className="text-xs text-ink-400">
              Connect exactly one linear chain of Action or Set Variable steps after this node — that chain runs once per item.
            </p>
          </>
        )}

        {node.type === 'logic.setVariable' && (
          <AssignmentsEditor
            assignments={(config.assignments as { key: string; valueExpression: string }[]) ?? []}
            onChange={(assignments) => setConfig({ assignments })}
          />
        )}

        {node.type === 'logic.merge' && <p className="text-sm text-ink-500">Waits until every incoming branch has finished before continuing.</p>}

        {node.type === 'action.createTask' && (
          <>
            <ExpressionField label="Title" value={String(config.title ?? '')} onChange={(v) => setConfig({ title: v })} required />
            <ExpressionField label="Description" value={String(config.description ?? '')} onChange={(v) => setConfig({ description: v })} multiline />
            <StatusSelect value={String(config.status ?? '')} onChange={(v) => setConfig({ status: v })} />
            <PrioritySelect value={String(config.priority ?? '')} onChange={(v) => setConfig({ priority: v })} />
            <DateExpressionField label="Due date" value={String(config.dueDate ?? '')} onChange={(v) => setConfig({ dueDate: v })} />
            <IdPickerField label="Project" value={String(config.projectId ?? '')} onChange={(v) => setConfig({ projectId: v })} options={refs.projects} />
            <IdPickerField label="Client" value={String(config.clientId ?? '')} onChange={(v) => setConfig({ clientId: v })} options={refs.clients} />
            <IdPickerField label="Assignee" value={String(config.assigneeId ?? '')} onChange={(v) => setConfig({ assigneeId: v })} options={refs.employees} />
          </>
        )}

        {(node.type === 'action.updateTask' || node.type === 'action.deleteTask') && (
          <>
            <IdPickerField label="Task" value={String(config.taskId ?? '')} onChange={(v) => setConfig({ taskId: v })} options={refs.tasks} required />
            {node.type === 'action.updateTask' && (
              <>
                <ExpressionField label="Title" value={String(config.title ?? '')} onChange={(v) => setConfig({ title: v })} />
                <StatusSelect value={String(config.status ?? '')} onChange={(v) => setConfig({ status: v })} />
                <PrioritySelect value={String(config.priority ?? '')} onChange={(v) => setConfig({ priority: v })} />
                <DateExpressionField label="Due date" value={String(config.dueDate ?? '')} onChange={(v) => setConfig({ dueDate: v })} />
                <IdPickerField label="Assignee" value={String(config.assigneeId ?? '')} onChange={(v) => setConfig({ assigneeId: v })} options={refs.employees} />
              </>
            )}
          </>
        )}

        {node.type === 'action.createProject' && (
          <>
            <ExpressionField label="Name" value={String(config.name ?? '')} onChange={(v) => setConfig({ name: v })} required />
            <ExpressionField label="Description" value={String(config.description ?? '')} onChange={(v) => setConfig({ description: v })} multiline />
            <ProjectStatusSelect value={String(config.status ?? '')} onChange={(v) => setConfig({ status: v })} />
            <DateExpressionField label="Due date" value={String(config.dueDate ?? '')} onChange={(v) => setConfig({ dueDate: v })} />
            <IdPickerField label="Client" value={String(config.clientId ?? '')} onChange={(v) => setConfig({ clientId: v })} options={refs.clients} />
            <ExpressionField label="Budget" value={String(config.budget ?? '')} onChange={(v) => setConfig({ budget: Number(v) || v })} />
          </>
        )}

        {(node.type === 'action.updateProject' || node.type === 'action.deleteProject') && (
          <>
            <IdPickerField label="Project" value={String(config.projectId ?? '')} onChange={(v) => setConfig({ projectId: v })} options={refs.projects} required />
            {node.type === 'action.updateProject' && (
              <>
                <ExpressionField label="Name" value={String(config.name ?? '')} onChange={(v) => setConfig({ name: v })} />
                <ProjectStatusSelect value={String(config.status ?? '')} onChange={(v) => setConfig({ status: v })} />
                <DateExpressionField label="Due date" value={String(config.dueDate ?? '')} onChange={(v) => setConfig({ dueDate: v })} />
              </>
            )}
          </>
        )}

        {node.type === 'action.createInvoice' && (
          <>
            <IdPickerField label="Client" value={String(config.clientId ?? '')} onChange={(v) => setConfig({ clientId: v })} options={refs.clients} />
            <DateExpressionField label="Issue date" value={String(config.issueDate ?? '')} onChange={(v) => setConfig({ issueDate: v })} required />
            <DateExpressionField label="Due date" value={String(config.dueDate ?? '')} onChange={(v) => setConfig({ dueDate: v })} />
            <NumberField label="Tax rate (%)" value={Number(config.taxRate ?? 0)} onChange={(v) => setConfig({ taxRate: v })} min={0} max={100} />
            <NumberField label="Discount" value={Number(config.discount ?? 0)} onChange={(v) => setConfig({ discount: v })} min={0} />
            <InvoiceItemsEditor
              items={(config.items as { description: string; quantity: number; unitPrice: number }[]) ?? []}
              onChange={(items) => setConfig({ items })}
            />
            <ExpressionField label="Notes" value={String(config.notes ?? '')} onChange={(v) => setConfig({ notes: v })} multiline />
          </>
        )}

        {(node.type === 'action.updateInvoiceStatus' || node.type === 'action.deleteInvoice') && (
          <>
            <IdPickerField label="Invoice" value={String(config.invoiceId ?? '')} onChange={(v) => setConfig({ invoiceId: v })} options={refs.invoices} required />
            {node.type === 'action.updateInvoiceStatus' && (
              <FieldGroup>
                <Label>New status</Label>
                <Select value={String(config.status ?? 'sent')} onChange={(e) => setConfig({ status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FieldGroup>
            )}
          </>
        )}

        {node.type === 'action.sendClientMessage' && (
          <>
            <IdPickerField label="Conversation" value={String(config.conversationId ?? '')} onChange={(v) => setConfig({ conversationId: v })} options={refs.conversations} required />
            <ExpressionField label="Message" value={String(config.body ?? '')} onChange={(v) => setConfig({ body: v })} multiline required />
          </>
        )}

        {node.type === 'action.sendTeamChannelMessage' && (
          <>
            <IdPickerField label="Channel or DM" value={String(config.channelId ?? '')} onChange={(v) => setConfig({ channelId: v })} options={refs.channels} required />
            <ExpressionField label="Message" value={String(config.body ?? '')} onChange={(v) => setConfig({ body: v })} multiline required />
          </>
        )}

        {node.type === 'action.notifyEmployee' && (
          <>
            <IdPickerField label="Employee" value={String(config.employeeId ?? '')} onChange={(v) => setConfig({ employeeId: v })} options={refs.employees} required />
            <ExpressionField label="Title" value={String(config.title ?? '')} onChange={(v) => setConfig({ title: v })} required />
            <ExpressionField label="Message" value={String(config.body ?? '')} onChange={(v) => setConfig({ body: v })} multiline required />
          </>
        )}

        <div className="border-t border-ink-100 pt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">Available data</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="font-mono text-[10px]">{'{{trigger...}}'}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">{'{{steps.<step-name>.output}}'}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">{'{{vars.<name>}}'}</Badge>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-400">
            {workflow?.trigger.type === 'trigger.event'
              ? `e.g. {{trigger.${workflow.trigger.entityType}.title}}`
              : 'Reference earlier steps by the name shown on their card.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FieldGroup>
      <Label>Status</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Leave unchanged</option>
        <option value="todo">To do</option>
        <option value="in-progress">In progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
      </Select>
    </FieldGroup>
  );
}

function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FieldGroup>
      <Label>Priority</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Leave unchanged</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </Select>
    </FieldGroup>
  );
}

function ProjectStatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FieldGroup>
      <Label>Status</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Leave unchanged</option>
        <option value="planning">Planning</option>
        <option value="in-progress">In progress</option>
        <option value="review">Review</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </Select>
    </FieldGroup>
  );
}

function AssignmentsEditor({
  assignments,
  onChange,
}: {
  assignments: { key: string; valueExpression: string }[];
  onChange: (a: { key: string; valueExpression: string }[]) => void;
}) {
  const rows = assignments.length ? assignments : [{ key: '', valueExpression: '' }];
  return (
    <FieldGroup>
      <div className="flex items-center justify-between">
        <Label>Variables</Label>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...rows, { key: '', valueExpression: '' }])}>
          <Plus size={13} />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <Input
              className="w-24 flex-shrink-0"
              placeholder="name"
              value={row.key}
              onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))}
            />
            <Input
              placeholder="{{trigger...}}"
              value={row.valueExpression}
              onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, valueExpression: e.target.value } : r)))}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} disabled={rows.length === 1}>
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
      </div>
    </FieldGroup>
  );
}

function InvoiceItemsEditor({
  items,
  onChange,
}: {
  items: { description: string; quantity: number; unitPrice: number }[];
  onChange: (items: { description: string; quantity: number; unitPrice: number }[]) => void;
}) {
  const rows = items.length ? items : [{ description: '', quantity: 1, unitPrice: 0 }];
  return (
    <FieldGroup>
      <div className="flex items-center justify-between">
        <Label>Line items</Label>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...rows, { description: '', quantity: 1, unitPrice: 0 }])}>
          <Plus size={13} />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="space-y-1 rounded-sm border border-ink-200 p-2">
            <Input
              placeholder="Description"
              value={row.description}
              onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, description: e.target.value } : r)))}
            />
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                placeholder="Qty"
                value={row.quantity}
                onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, quantity: Number(e.target.value) } : r)))}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                value={row.unitPrice}
                onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, unitPrice: Number(e.target.value) } : r)))}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, idx) => idx !== i))} disabled={rows.length === 1}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </FieldGroup>
  );
}
