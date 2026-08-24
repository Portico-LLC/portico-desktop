import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, cleanPayload, getErrorMessage } from '@/lib/api';
import type { ProjectTemplate, Client } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { LayoutTemplate, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const instantiateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  clientId: z.string().optional(),
  dueDate: z.string().optional(),
});
type InstantiateForm = z.infer<typeof instantiateSchema>;

export function ProjectTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [instantiatingTemplate, setInstantiatingTemplate] = useState<ProjectTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const { data: templates = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => api.get<ProjectTemplate[]>('/project-templates').then((res) => res.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients').then((res) => res.data),
    enabled: !!instantiatingTemplate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/project-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      setDeleteTemplateId(null);
    },
  });

  const instantiateMutation = useMutation({
    mutationFn: ({ templateId, ...payload }: InstantiateForm & { templateId: string }) =>
      api.post(`/project-templates/${templateId}/instantiate`, cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setInstantiatingTemplate(null);
      navigate('/projects');
      void project;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstantiateForm>({ resolver: zodResolver(instantiateSchema) });

  const openInstantiate = (template: ProjectTemplate) => {
    reset({ name: template.name, clientId: '', dueDate: '' });
    setInstantiatingTemplate(template);
  };

  const onSubmit = (values: InstantiateForm) => {
    if (!instantiatingTemplate) return;
    instantiateMutation.mutate({ templateId: instantiatingTemplate.id, ...values });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-display font-semibold text-ink-900">Templates</h1>
        <p className="text-ink-500">
          Reusable project shapes, saved from past work — spin up repeat client projects without re-entering everything.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-terracotta-500/30 bg-terracotta-100/60 p-12 text-center text-sm text-terracotta-700 shadow-xs">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-terracotta-500" />
          <p className="mb-3">Couldn't load templates — {getErrorMessage(error)}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-ink-200 bg-bone-50 p-12 text-center text-sm text-ink-400 shadow-xs">
          <LayoutTemplate className="mx-auto mb-3 h-8 w-8 text-ink-300" />
          No templates yet. Save one from an existing project's page.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <button
                  onClick={() => setDeleteTemplateId(template.id)}
                  className="flex-shrink-0 text-ink-300 transition-colors duration-hover ease-brand hover:text-terracotta-600"
                  title="Delete template"
                >
                  <Trash2 size={15} />
                </button>
              </CardHeader>
              <CardContent>
                {template.description && <p className="mb-2 line-clamp-2 text-sm text-ink-500">{template.description}</p>}
                <p className="text-xs text-ink-400">
                  {(template.tasks ?? []).length} task{(template.tasks ?? []).length !== 1 ? 's' : ''}
                </p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="primary" size="sm" onClick={() => openInstantiate(template)}>
                  <Sparkles size={14} />
                  New from template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!instantiatingTemplate} onOpenChange={(open) => !open && setInstantiatingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project from "{instantiatingTemplate?.name}"</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Project name</Label>
              <Input id="template-name" {...register('name')} />
              {errors.name && <p className="text-xs text-terracotta-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-client">Client (optional)</Label>
              <Select id="template-client" {...register('clientId')} placeholder="No client">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-due">Due date (optional)</Label>
              <Input id="template-due" type="date" {...register('dueDate')} />
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={instantiateMutation.isPending}>
              {instantiateMutation.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTemplateId}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
        title="Delete this template?"
        description="This won't affect any projects already created from it."
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTemplateId && deleteMutation.mutate(deleteTemplateId)}
      />
    </div>
  );
}
