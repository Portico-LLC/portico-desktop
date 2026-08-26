import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, cleanPayload } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Project, Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Search, Plus, Edit, Trash2, Activity, LayoutTemplate } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

const projectSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  status: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  clientId: z.string().optional(),
});
type ProjectForm = z.infer<typeof projectSchema>;

export function Projects() {
  const queryClient = useQueryClient();
  const isOwner = useAuthStore((s) => s.role) === 'user';
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [templatingProject, setTemplatingProject] = useState<Project | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [searchParams] = useSearchParams();

  // Lets the command palette's "New project" quick action open this page's own create dialog.
  useEffect(() => {
    if (searchParams.get('new') === '1') setDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients').then((res) => res.data),
    enabled: dialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ProjectForm) =>
      api.post('/projects', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDialogOpen(false);
    },
    meta: { successMessage: 'Project created', errorTitle: 'Could not create project' },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: Partial<Project> & { id: string }) =>
      api.patch(`/projects/${id}`, cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDialogOpen(false);
      setEditingProject(null);
    },
    meta: { successMessage: 'Project updated', errorTitle: 'Could not update project' },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    meta: { successMessage: 'Project deleted', errorTitle: 'Could not delete project' },
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) =>
      api.post(`/projects/${projectId}/save-as-template`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      setTemplatingProject(null);
      setTemplateName('');
    },
    meta: { successMessage: 'Template saved', errorTitle: 'Could not save template' },
  });

  const filteredProjects = (projects || []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onSubmit = (data: ProjectForm) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (projectsLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Projects</h1>
          <p className="text-ink-500">Track your projects and their progress.</p>
        </div>
        {isOwner && (
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <Plus size={18} />
            New Project
          </Button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <Input
            placeholder="Search projects..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredProjects.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-400">
              {search ? 'No projects match your search.' : 'No projects yet. Create your first project.'}
            </div>
          ) : (
            <div className="divide-y divide-ink-200">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-ink-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pine-100 text-pine-700">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4h12v2H4zM4 10h12v2H4zM4 16h8v2H4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-ink-900">{project.name}</p>
                      {project.client && <p className="text-sm text-ink-400">{project.client.name}</p>}
                      {project.dueDate && (
                        <p className="text-xs text-ink-400">
                          Due {format(new Date(project.dueDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {project.progress != null && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-ink-900">{project.progress}%</p>
                        <div className="w-16 bg-ink-200 rounded-full h-1.5">
                          <div
                            className="bg-pine-600 h-1.5 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Badge
                      variant={
                        project.status === 'completed'
                          ? 'moss'
                          : project.status === 'in-progress'
                          ? 'pine'
                          : project.status === 'paused'
                          ? 'ochre'
                          : project.status === 'cancelled'
                          ? 'terracotta'
                          : 'neutral'
                      }
                    >
                      {project.status?.replace(/-/g, ' ') || 'Planning'}
                    </Badge>
                    <Link
                      to={`/pulse?scope=project&projectId=${project.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      title="Activity"
                    >
                      <Activity size={14} />
                    </Link>
                    {isOwner && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Save as template"
                          onClick={() => { setTemplatingProject(project); setTemplateName(`${project.name} Template`); }}
                        >
                          <LayoutTemplate size={14} />
                          <span className="hidden lg:inline">Save as template</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingProject(project); setDialogOpen(true); }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteProjectId(project.id)}
                          className="text-terracotta-600 hover:bg-terracotta-100"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit' : 'New'} Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            key={editingProject?.id || 'new'}
            project={editingProject}
            clients={clients}
            onSubmit={onSubmit}
            onCancel={() => setDialogOpen(false)}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteProjectId}
        onOpenChange={(open) => { if (!open) setDeleteProjectId(null); }}
        title="Delete project"
        description="This will permanently remove this project and its data. This action cannot be undone."
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteProjectId) {
            deleteMutation.mutate(deleteProjectId, { onSuccess: () => setDeleteProjectId(null) });
          }
        }}
      />

      <Dialog open={!!templatingProject} onOpenChange={(open) => !open && setTemplatingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save "{templatingProject?.name}" as a template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-save-name">Template name</Label>
              <Input id="template-save-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            </div>
            <Button
              variant="primary"
              className="w-full"
              disabled={!templateName.trim() || saveAsTemplateMutation.isPending}
              onClick={() =>
                templatingProject &&
                saveAsTemplateMutation.mutate({ projectId: templatingProject.id, name: templateName.trim() })
              }
            >
              {saveAsTemplateMutation.isPending ? 'Saving…' : 'Save template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectForm({
  project,
  clients,
  onSubmit,
  onCancel,
  loading,
}: {
  project: Project | null;
  clients: Client[];
  onSubmit: (data: ProjectForm) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'planning',
      progress: project?.progress ?? 0,
      dueDate: project?.dueDate ? format(new Date(project.dueDate), 'yyyy-MM-dd') : '',
      clientId: project?.clientId ?? '',
    },
  });

  return (
    <form onSubmit={(e) => handleSubmit(onSubmit)(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="New project" {...register('name')} />
        {errors.name && <p className="text-xs text-terracotta-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="flex min-h-[60px] w-full rounded-sm border border-ink-300 bg-bone-50 px-3 py-2 text-base placeholder:text-ink-400 focus:border-brass-500 focus:outline-none"
          placeholder="What is this project about?"
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register('status')}>
            <option value="planning">Planning</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="progress">Progress (%)</Label>
          <Input id="progress" type="number" min="0" max="100" {...register('progress', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" {...register('dueDate')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientId">Client</Label>
          <Select id="clientId" {...register('clientId')}>
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving…' : project ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
