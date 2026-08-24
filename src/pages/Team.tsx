import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, cleanPayload } from '@/lib/api';
import type { Employee, Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Search, Plus, Edit, Trash2, FolderKanban, Mail } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { InviteDialog } from '@/components/InviteDialog';
import { InvitesPanel } from '@/components/InvitesPanel';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const employeeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  status: z.string().optional(),
  password: z.string().min(6, 'At least 6 characters').optional().or(z.literal('')),
});
type EmployeeForm = z.infer<typeof employeeSchema>;

export function Team() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [assigningEmployee, setAssigningEmployee] = useState<Employee | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/employees').then((res) => res.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
  });

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const createMutation = useMutation({
    mutationFn: (payload: EmployeeForm) =>
      api.post('/employees', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: Partial<EmployeeForm> & { id: string }) =>
      api.patch(`/employees/${id}`, cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDialogOpen(false);
      setEditingEmployee(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, projectIds }: { id: string; projectIds: string[] }) =>
      api.put(`/employees/${id}/projects`, { projectIds }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setAssigningEmployee(null);
    },
  });

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onSubmit = (data: EmployeeForm) => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (employee: Employee | null) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Team</h1>
          <p className="text-ink-500">Add employees and assign them to projects.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setInviteDialogOpen(true)}>
            <Mail size={18} />
            Invite Employee
          </Button>
          <Button variant="primary" onClick={() => openDialog(null)}>
            <Plus size={18} />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <Input
            placeholder="Search team..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filteredEmployees.length} team member{filteredEmployees.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-400">
              {search ? 'No team members match your search.' : 'No employees yet. Add your first team member.'}
            </div>
          ) : (
            <div className="divide-y divide-ink-200">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-ink-50"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={employee.name} />
                    <div>
                      <p className="font-medium text-ink-900">{employee.name}</p>
                      {employee.email && <p className="text-xs text-ink-400">{employee.email}</p>}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {employee.projectIds.length === 0 ? (
                          <span className="text-xs text-ink-400">No projects assigned</span>
                        ) : (
                          employee.projectIds.map((id) => (
                            <Badge key={id} variant="neutral">
                              {projectsById.get(id)?.name ?? 'Unknown project'}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={employee.status === 'suspended' ? 'terracotta' : 'moss'}>
                      {employee.status || 'active'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => setAssigningEmployee(employee)}>
                      <FolderKanban size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDialog(employee)}>
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteEmployeeId(employee.id)}
                      className="text-terracotta-600 hover:bg-terracotta-100"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InvitesPanel type="employee" />

      <InviteDialog type="employee" open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit' : 'Add'} Employee</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields
            key={editingEmployee?.id || 'new'}
            employee={editingEmployee}
            onSubmit={onSubmit}
            onCancel={() => setDialogOpen(false)}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigningEmployee} onOpenChange={(open) => !open && setAssigningEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Projects — {assigningEmployee?.name}</DialogTitle>
          </DialogHeader>
          {assigningEmployee && (
            <AssignProjectsForm
              employee={assigningEmployee}
              projects={projects}
              onSubmit={(projectIds) => assignMutation.mutate({ id: assigningEmployee.id, projectIds })}
              onCancel={() => setAssigningEmployee(null)}
              loading={assignMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteEmployeeId}
        onOpenChange={(open) => { if (!open) setDeleteEmployeeId(null); }}
        title="Remove employee"
        description="This will permanently remove this employee and their project assignments. This action cannot be undone."
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteEmployeeId) {
            deleteMutation.mutate(deleteEmployeeId, { onSuccess: () => setDeleteEmployeeId(null) });
          }
        }}
      />
    </div>
  );
}

function EmployeeFormFields({
  employee,
  onSubmit,
  onCancel,
  loading,
}: {
  employee: Employee | null;
  onSubmit: (data: EmployeeForm) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? '',
      email: employee?.email ?? '',
      phone: employee?.phone ?? '',
      status: employee?.status ?? 'active',
    },
  });

  return (
    <form onSubmit={(e) => handleSubmit(onSubmit)(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="emp-name">Name</Label>
        <Input id="emp-name" placeholder="Jane Doe" {...register('name')} />
        {errors.name && <p className="text-xs text-terracotta-600">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-email">Email</Label>
        <Input id="emp-email" type="email" placeholder="jane@studio.com" {...register('email')} />
        {errors.email && <p className="text-xs text-terracotta-600">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-phone">Phone</Label>
        <Input id="emp-phone" placeholder="+1 555 0000" {...register('phone')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-password">{employee ? 'Reset Password' : 'Password'}</Label>
        <Input
          id="emp-password"
          type="password"
          placeholder={employee ? 'Leave blank to keep current password' : 'Set a login password'}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-terracotta-600">{errors.password.message}</p>}
        {!employee && (
          <p className="text-xs text-ink-400">
            The employee uses this with their email to sign in — they can change it later in Settings.
          </p>
        )}
      </div>
      {employee && (
        <div className="space-y-2">
          <Label htmlFor="emp-status">Status</Label>
          <Select id="emp-status" {...register('status')}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving…' : employee ? 'Save Changes' : 'Add Employee'}
        </Button>
      </div>
    </form>
  );
}

function AssignProjectsForm({
  employee,
  projects,
  onSubmit,
  onCancel,
  loading,
}: {
  employee: Employee;
  projects: Project[];
  onSubmit: (projectIds: string[]) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(employee.projectIds));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {projects.length === 0 ? (
        <p className="text-sm text-ink-400">No projects yet. Create a project first.</p>
      ) : (
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {projects.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer select-none items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-ink-50"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
              />
              {p.name}
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={loading} onClick={() => onSubmit([...selected])}>
          {loading ? 'Saving…' : 'Save Assignments'}
        </Button>
      </div>
    </div>
  );
}
