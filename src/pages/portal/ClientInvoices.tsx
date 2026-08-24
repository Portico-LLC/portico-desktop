import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Invoice } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { FileText, Download, Send, CircleCheck, CircleX } from 'lucide-react';

const STATUS_META: Record<string, { label: string; variant: 'neutral' | 'moss' | 'ochre' | 'terracotta' | 'steel'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'neutral', icon: <FileText size={14} /> },
  sent: { label: 'Sent', variant: 'steel', icon: <Send size={14} /> },
  paid: { label: 'Paid', variant: 'moss', icon: <CircleCheck size={14} /> },
  overdue: { label: 'Overdue', variant: 'terracotta', icon: <CircleX size={14} /> },
};

const currencyFormatter = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function ClientInvoices() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['client', 'invoices'],
    queryFn: () => api.get<Invoice[]>('/client/invoices').then((res) => res.data),
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Invoices</h1>
        <p className="text-ink-500">View and download your invoices.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-ink-100 flex items-center justify-center mb-4">
              <FileText size={20} className="text-ink-400" />
            </div>
            <h3 className="text-base font-semibold text-ink-900 mb-1">No invoices yet</h3>
            <p className="text-sm text-ink-400">When your team sends invoices, they'll show up here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wider text-ink-400">
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Due</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                    <th className="px-6 py-3 font-medium text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {invoices.map((invoice) => {
                    const meta = STATUS_META[invoice.status] ?? STATUS_META.sent;
                    return (
                      <tr key={invoice.id} className="hover:bg-bone-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-sm bg-pine-100 flex items-center justify-center flex-shrink-0">
                              <FileText size={16} className="text-pine-700" />
                            </div>
                            <div>
                              <p className="font-medium text-ink-900">{invoice.invoiceNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-ink-600">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</td>
                        <td className="px-6 py-4 text-ink-600">
                          {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={meta.variant} dot>
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-ink-900">
                          {currencyFormatter(invoice.total)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            title="Download PDF"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-sm text-ink-400 hover:text-brass-600 hover:bg-brass-100 transition-colors"
                          >
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
