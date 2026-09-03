import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, cleanPayload } from '@/lib/api';
import type { Invoice, Client, InvoiceStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { InvoiceViewerModal } from '@/components/invoices/InvoiceViewerModal';
import { Plus, Search, FileText, Trash2, Send, CheckCircle2, XCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const STATUS_META: Record<InvoiceStatus, { label: string; variant: 'neutral' | 'pine' | 'moss' | 'ochre' | 'terracotta' | 'steel' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  sent: { label: 'Sent', variant: 'pine' },
  paid: { label: 'Paid', variant: 'moss' },
  overdue: { label: 'Overdue', variant: 'terracotta' },
  cancelled: { label: 'Cancelled', variant: 'steel' },
};

const itemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
});

const invoiceSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  taxRate: z.number().min(0).max(100),
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one line item'),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

const currencyFormatter = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

function computeRowAmount(quantity: number, unitPrice: number) {
  return quantity * unitPrice;
}

export function Invoices() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewerInvoice, setViewerInvoice] = useState<Invoice | null>(null);
  const [searchParams] = useSearchParams();

  // Lets the command palette's "New invoice" quick action open this page's own create dialog.
  useEffect(() => {
    if (searchParams.get('new') === '1') setDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<Invoice[]>('/invoices').then((res) => res.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients').then((res) => res.data),
    enabled: dialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: (payload: InvoiceForm) =>
      api.post('/invoices', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceForm }) =>
      api.patch(`/invoices/${id}`, cleanPayload(data as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDialogOpen(false);
      setEditingInvoice(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.patch(`/invoices/${id}/status`, { status }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const filteredInvoices = (invoices || []).filter(
    (inv) =>
      (statusFilter === 'all' || inv.status === statusFilter) &&
      (inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        (inv.client?.name ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const onSubmit = (data: InvoiceForm) => {
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreate = () => {
    setEditingInvoice(null);
    setDialogOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const downloadInvoicePdf = async (invoice: Invoice) => {
    const res = await api.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
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
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    total: invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0),
    outstanding: invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + (Number(i.total) || 0), 0),
    paid: invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + (Number(i.total) || 0), 0),
    count: invoices.length,
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Invoices</h1>
          <p className="text-ink-500">Create and manage invoices for your clients.</p>
        </div>
        <Button variant="primary" data-tour-id="invoices.newInvoice" onClick={openCreate}>
          <Plus size={18} />
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-ink-500 font-medium mb-2">Total Billed</p>
            <p className="text-3xl font-semibold text-ink-900">{currencyFormatter(stats.total)}</p>
            <p className="text-xs text-ink-400 mt-2">{stats.count} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-ink-500 font-medium mb-2">Outstanding</p>
            <p className="text-3xl font-semibold text-ink-900">{currencyFormatter(stats.outstanding)}</p>
            <p className="text-xs text-terracotta-600 mt-2">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-ink-500 font-medium mb-2">Collected</p>
            <p className="text-3xl font-semibold text-ink-900">{currencyFormatter(stats.paid)}</p>
            <p className="text-xs text-moss-600 mt-2">Paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-ink-500 font-medium mb-2">Overdue</p>
            <p className="text-3xl font-semibold text-terracotta-600">
              {invoices.filter((i) => i.status === 'overdue').length}
            </p>
            <p className="text-xs text-ink-400 mt-2">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <Input
            placeholder="Search invoices or clients..."
            className="pl-10 w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-400">
              {search || statusFilter !== 'all'
                ? 'No invoices match your filters.'
                : 'No invoices yet. Create your first invoice.'}
            </div>
          ) : (
            <div className="divide-y divide-ink-200">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-ink-50"
                  onClick={() => setViewerInvoice(invoice)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brass-100 text-brass-700 flex-shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900 truncate">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-ink-400 truncate">
                        {invoice.client?.name || 'No client'} · Issued{' '}
                        {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={STATUS_META[invoice.status].variant}>
                      {STATUS_META[invoice.status].label}
                    </Badge>
                    <p className="text-sm font-medium text-ink-900 w-24 text-right">
                      {currencyFormatter(Number(invoice.total) || 0)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Download PDF"
                        onClick={() => downloadInvoicePdf(invoice)}
                      >
                        <Download size={14} />
                      </Button>
                      {(invoice.status === 'draft' || invoice.status === 'sent') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Mark as sent"
                          onClick={() => statusMutation.mutate({ id: invoice.id, status: 'sent' })}
                        >
                          <Send size={14} />
                        </Button>
                      )}
                      {invoice.status === 'sent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Mark as paid"
                          className="text-moss-600 hover:bg-moss-100"
                          onClick={() => statusMutation.mutate({ id: invoice.id, status: 'paid' })}
                        >
                          <CheckCircle2 size={14} />
                        </Button>
                      )}
                      {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Cancel invoice"
                          className="text-ink-400 hover:bg-ink-100"
                          onClick={() => statusMutation.mutate({ id: invoice.id, status: 'cancelled' })}
                        >
                          <XCircle size={14} />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(invoice)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-terracotta-600 hover:bg-terracotta-100"
                        onClick={() => deleteMutation.mutate(invoice.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? `Edit ${editingInvoice.invoiceNumber}` : 'New Invoice'}</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            key={editingInvoice?.id || 'new'}
            invoice={editingInvoice}
            clients={clients}
            onSubmit={onSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditingInvoice(null);
            }}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <InvoiceViewerModal invoice={viewerInvoice} onClose={() => setViewerInvoice(null)} />
    </div>
  );
}

function InvoiceForm({
  invoice,
  clients,
  onSubmit,
  onCancel,
  loading,
}: {
  invoice: Invoice | null;
  clients: Client[];
  onSubmit: (data: InvoiceForm) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: invoice?.clientId ?? '',
      issueDate: invoice?.issueDate ? format(new Date(invoice.issueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      dueDate: invoice?.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : '',
      taxRate: invoice ? Number(invoice.taxRate) : 0,
      discount: invoice ? Number(invoice.discount) : 0,
      notes: invoice?.notes ?? '',
      items:
        invoice?.items?.length
          ? invoice.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
            }))
          : [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');
  const taxRate = watch('taxRate') || 0;
  const discount = watch('discount') || 0;
  const subtotal = (items || []).reduce(
    (sum, item) => sum + computeRowAmount(Number(item?.quantity || 0), Number(item?.unitPrice || 0)),
    0
  );
  const taxAmount = (subtotal * taxRate) / 100;
  const total = Math.max(0, subtotal - discount + taxAmount);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue Date</Label>
          <Input id="issueDate" type="date" {...register('issueDate')} />
          {errors.issueDate && <p className="text-xs text-terracotta-600">{errors.issueDate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" {...register('dueDate')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxRate">Tax Rate (%)</Label>
          <Input id="taxRate" type="number" min="0" step="0.01" {...register('taxRate', { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount">Discount</Label>
          <Input id="discount" type="number" min="0" step="0.01" {...register('discount', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          <Button type="button" variant="secondary" size="sm" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
            <Plus size={14} />
            Add Item
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Description"
                  {...register(`items.${index}.description` as const)}
                />
                {errors.items?.[index]?.description && (
                  <p className="text-xs text-terracotta-600">{errors.items[index]?.description?.message}</p>
                )}
              </div>
              <div className="w-20 space-y-1">
                <Input type="number" min="1" placeholder="Qty" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
              </div>
              <div className="w-28 space-y-1">
                <Input type="number" min="0" step="0.01" placeholder="Price" {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
              </div>
              <div className="w-24 space-y-1 text-right">
                <p className="text-sm font-medium text-ink-900 py-2">
                  {currencyFormatter(
                    computeRowAmount(
                      Number(items?.[index]?.quantity || 0),
                      Number(items?.[index]?.unitPrice || 0)
                    )
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-terracotta-600 hover:bg-terracotta-100"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
        {errors.items?.root && <p className="text-xs text-terracotta-600">{errors.items.root.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="flex min-h-[60px] w-full rounded-sm border border-ink-300 bg-bone-50 px-3 py-2 text-base placeholder:text-ink-400 focus:border-brass-500 focus:outline-none"
          placeholder="Payment terms, thank-you notes, etc."
          {...register('notes')}
        />
      </div>

      <div className="rounded-sm border border-ink-200 bg-ink-50 p-4 space-y-1.5">
        <div className="flex justify-between text-sm text-ink-600">
          <span>Subtotal</span>
          <span className="font-medium text-ink-900">{currencyFormatter(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-ink-600">
          <span>Tax ({taxRate}%)</span>
          <span className="font-medium text-ink-900">{currencyFormatter(taxAmount)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-ink-600">
            <span>Discount</span>
            <span className="font-medium text-ink-900">-{currencyFormatter(discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-ink-200 pt-1.5">
          <span className="font-medium text-ink-900">Total</span>
          <span className="font-semibold text-ink-900">{currencyFormatter(total)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving…' : invoice ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}