import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ClientOverview, Task } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';
import { FileText, CircleDollarSign, Briefcase, CheckSquare, MessageSquare, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const currencyFormatter = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const STATUS_META: Record<string, { label: string; variant: 'neutral' | 'pine' | 'moss' | 'ochre' | 'terracotta' }> = {
  todo: { label: 'To Do', variant: 'neutral' },
  'in-progress': { label: 'In Progress', variant: 'pine' },
  review: { label: 'Review', variant: 'ochre' },
  done: { label: 'Done', variant: 'moss' },
};

export function ClientDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['client', 'overview'],
    queryFn: () => api.get<ClientOverview>('/client/overview').then((res) => res.data),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['client', 'tasks'],
    queryFn: () => api.get<Task[]>('/client/tasks').then((res) => res.data),
  });

  const recent = [...tasks].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-ink-500">Here's what's happening across your projects.</p>
      </div>

      {isLoading || !overview ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-500 font-medium mb-2">Total Billed</p>
                  <CircleDollarSign size={18} className="text-brass-600" />
                </div>
                <p className="text-3xl font-semibold text-ink-900">{currencyFormatter(overview.totalBilled)}</p>
                <p className="text-xs text-ink-400 mt-2">{overview.invoiceCount} invoice{overview.invoiceCount !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-500 font-medium mb-2">Outstanding</p>
                  <FileText size={18} className="text-ochre-600" />
                </div>
                <p className="text-3xl font-semibold text-ink-900">{currencyFormatter(overview.outstanding)}</p>
                <p className="text-xs text-ochre-600 mt-2">{overview.openInvoices} awaiting payment</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-500 font-medium mb-2">Active Projects</p>
                  <Briefcase size={18} className="text-pine-600" />
                </div>
                <p className="text-3xl font-semibold text-ink-900">{overview.projectsInProgress} / {overview.projectCount}</p>
                <p className="text-xs text-ink-400 mt-2">in progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-500 font-medium mb-2">Open Tasks</p>
                  <CheckSquare size={18} className="text-pine-600" />
                </div>
                <p className="text-3xl font-semibold text-ink-900">{overview.tasksOpen}</p>
                <p className="text-xs text-ink-400 mt-2">of {overview.taskCount} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-500 font-medium mb-2">Completed</p>
                  <CheckCircle2 size={18} className="text-moss-600" />
                </div>
                <p className="text-3xl font-semibold text-ink-900">{overview.tasksDone}</p>
                <p className="text-xs text-moss-600 mt-2">done tasks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-500 font-medium mb-2">Unread Messages</p>
                  <MessageSquare size={18} className="text-steel-600" />
                </div>
                <p className="text-3xl font-semibold text-ink-900">{overview.unreadMessages}</p>
                <p className="text-xs text-ink-400 mt-2">from your team</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink-900">Recent Task Updates</h3>
                <Link
                  to="/portal/tasks"
                  className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-pine-700 hover:text-pine-900 transition-colors"
                >
                  View all
                  <ArrowRight size={14} />
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-ink-400 py-4">No tasks yet. Your team will add tasks to your projects.</p>
              ) : (
                <div className="divide-y divide-ink-200">
                  {recent.map((task) => (
                    <div key={task.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900 truncate">{task.title}</p>
                        <p className="text-xs text-ink-400">
                          {task.project?.name ?? 'No project'} · Updated {format(new Date(task.updatedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant={STATUS_META[task.status]?.variant ?? 'neutral'} dot>
                        {STATUS_META[task.status]?.label ?? task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
