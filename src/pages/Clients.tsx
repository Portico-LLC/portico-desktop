import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, cleanPayload } from '@/lib/api';
import type { Client } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Search, Plus, Edit, Trash2, Mail, Activity } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { InviteDialog } from '@/components/InviteDialog';
import { InvitesPanel } from '@/components/InvitesPanel';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const clientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  company: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  password: z.string().min(6, 'At least 6 characters').optional().or(z.literal('')),
});
type ClientForm = z.infer<typeof clientSchema>;

export function Clients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Lets the command palette's "New client" quick action open this page's own create dialog.
  useEffect(() => {
    if (searchParams.get('new') === '1') setDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients').then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: ClientForm) => api.post('/clients', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDialogOpen(false);
    },
    meta: { successMessage: 'Client created', errorTitle: 'Could not create client' },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: Partial<Client> & { id: string }) =>
      api.patch(`/clients/${id}`, cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDialogOpen(false);
      setEditingClient(null);
    },
    meta: { successMessage: 'Client updated', errorTitle: 'Could not update client' },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    meta: { successMessage: 'Client deleted', errorTitle: 'Could not delete client' },
  });

  const filteredClients = (clients || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onSubmit = (data: ClientForm) => {
    if (editingClient) {
      const { password: _password, ...rest } = data;
      updateMutation.mutate({ id: editingClient.id, ...rest });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (client: Client | null) => {
    setEditingClient(client);
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
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Clients</h1>
          <p className="text-ink-500">Manage your clients and their information.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setInviteDialogOpen(true)}>
            <Mail size={18} />
            Invite Client
          </Button>
          <Button variant="primary" data-tour-id="clients.newClient" onClick={() => openDialog(null)}>
            <Plus size={18} />
            Add Client
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6">
        <div className="relative w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <Input
            placeholder="Search clients..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-400">
              {search ? 'No clients match your search.' : 'No clients yet. Create your first client.'}
            </div>
          ) : (
            <div className="divide-y divide-ink-200">
              {filteredClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 transition-colors hover:bg-ink-50">
                  <div className="flex items-center gap-4">
                    <Avatar name={client.name} />
                    <div>
                      <p className="font-medium text-ink-900">{client.name}</p>
                      {client.company && <p className="text-sm text-ink-400">{client.company}</p>}
                      {client.email && <p className="text-xs text-ink-400">{client.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={client.status === 'inactive' ? 'terracotta' : 'moss'}>
                      {client.status || 'active'}
                    </Badge>
                    <Link
                      to={`/pulse?scope=client&clientId=${client.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      title="Activity"
                    >
                      <Activity size={14} />
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => openDialog(client)}>
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteClientId(client.id)}
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

      <InvitesPanel type="client" />

      <InviteDialog type="client" open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit' : 'Add'} Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            key={editingClient?.id || 'new'}
            client={editingClient}
            onSubmit={onSubmit}
            onCancel={() => setDialogOpen(false)}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteClientId}
        onOpenChange={(open) => { if (!open) setDeleteClientId(null); }}
        title="Delete client"
        description="This will permanently remove this client and all associated data. This action cannot be undone."
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteClientId) {
            deleteMutation.mutate(deleteClientId, { onSuccess: () => setDeleteClientId(null) });
          }
        }}
      />
    </div>
  );
}

function ClientForm({
  client,
  onSubmit,
  onCancel,
  loading,
}: {
  client: Client | null;
  onSubmit: (data: ClientForm) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? '',
      company: client?.company ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      notes: client?.notes ?? '',
      status: client?.status ?? 'active',
    },
  });

  return (
    <form onSubmit={(e) => handleSubmit(onSubmit)(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Jane Doe" {...register('name')} />
        {errors.name && <p className="text-xs text-terracotta-600">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input id="company" placeholder="Studio Co." {...register('company')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="jane@studio.com" {...register('email')} />
        {errors.email && <p className="text-xs text-terracotta-600">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" placeholder="+1 555 0000" {...register('phone')} />
      </div>
      {!client && (
        <div className="space-y-2">
          <Label htmlFor="password">Portal Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Set a login password for the client portal"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-terracotta-600">{errors.password.message}</p>}
          <p className="text-xs text-ink-400">
            The client uses this with their email to log in to the portal. Optional — they can be added later.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving…' : client ? 'Update Client' : 'Add Client'}
        </Button>
      </div>
    </form>
  );
}
