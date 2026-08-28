import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';

const STATUS_VARIANT = {
  approved: 'moss',
  pending: 'ochre',
  rejected: 'terracotta',
} as const;

export function Companies() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['super-admin', 'companies'],
    queryFn: () => api.get<User[]>('/super-admin/companies').then((res) => res.data),
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/super-admin/companies/${id}/active`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] }),
    meta: { successMessage: 'Company updated', errorTitle: 'Could not update company' },
  });

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-bone-50">Companies</h1>
        <p className="mt-1 text-sm text-ink-400">
          {companies.length} compan{companies.length === 1 ? 'y' : 'ies'} on the platform.
        </p>
      </div>

      <div className="mb-5 relative w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <Input
          placeholder="Search companies..."
          className="border-ink-700 bg-ink-900 pl-10 text-bone-50 placeholder:text-ink-500 focus:border-brass-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-ink-800 bg-ink-900 hover:shadow-none hover:translate-y-0">
        <CardHeader className="border-ink-800">
          <CardTitle className="text-bone-50">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-500">No companies match your search.</div>
          ) : (
            <div className="divide-y divide-ink-800">
              {filtered.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 p-4">
                  <Link to={`/super-admin/companies/${c.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-bone-50">{c.company || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email}</p>
                      <p className="truncate text-sm text-ink-500">{c.email}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[c.approvalStatus ?? 'approved']}>{c.approvalStatus ?? 'approved'}</Badge>
                    {!c.isActive && <Badge variant="outline" className="border-ink-600 text-ink-400">inactive</Badge>}
                    <span className="text-xs text-ink-500">
                      {(c.enabledModules?.length ?? 0)} module{(c.enabledModules?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </Link>
                  <div className="flex flex-shrink-0 items-center gap-4">
                    <Switch
                      checked={!!c.isActive}
                      onCheckedChange={(checked) => setActive.mutate({ id: c.id, isActive: checked })}
                      title={c.isActive ? 'Deactivate' : 'Activate'}
                    />
                    <Link to={`/super-admin/companies/${c.id}`}>
                      <ChevronRight size={16} className="text-ink-500 transition-colors group-hover:text-bone-100" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
