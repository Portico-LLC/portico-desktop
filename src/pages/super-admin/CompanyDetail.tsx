import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { User, CompanyModule } from '@/lib/types';
import { MODULE_META, COMPANY_MODULES } from '@/lib/companyModules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { DeleteCompanyDialog } from '@/components/super-admin/DeleteCompanyDialog';

const STATUS_VARIANT = { approved: 'moss', pending: 'ochre', rejected: 'terracotta' } as const;

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['super-admin', 'companies', id],
    queryFn: () => api.get<User>(`/super-admin/companies/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies', id] });
    queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
  };

  const setActive = useMutation({
    mutationFn: (isActive: boolean) => api.patch(`/super-admin/companies/${id}/active`, { isActive }),
    onSuccess: invalidate,
    meta: { successMessage: 'Company updated', errorTitle: 'Could not update company' },
  });

  const setModules = useMutation({
    mutationFn: (enabledModules: CompanyModule[]) => api.patch(`/super-admin/companies/${id}/modules`, { enabledModules }),
    onSuccess: invalidate,
    meta: { successMessage: 'Modules updated', errorTitle: 'Could not update modules' },
  });

  const deleteCompany = useMutation({
    mutationFn: (confirm: string) => api.delete(`/super-admin/companies/${id}`, { data: { confirm } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
      navigate('/super-admin');
    },
    meta: { successMessage: 'Company deleted', errorTitle: 'Could not delete company' },
  });

  if (isLoading || !company) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const displayName = company.company || `${company.firstName ?? ''} ${company.lastName ?? ''}`.trim() || company.email;
  const enabled = new Set(company.enabledModules ?? COMPANY_MODULES);

  const toggleModule = (module: CompanyModule, checked: boolean) => {
    const next = new Set(enabled);
    if (checked) next.add(module);
    else next.delete(module);
    setModules.mutate(Array.from(next) as CompanyModule[]);
  };

  return (
    <div>
      <Link to="/super-admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-bone-100">
        <ArrowLeft size={14} /> Companies
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-medium text-bone-50">{displayName}</h1>
            <Badge variant={STATUS_VARIANT[company.approvalStatus ?? 'approved']}>{company.approvalStatus ?? 'approved'}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-400">{company.email}</p>
        </div>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={16} />
          Delete company
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-ink-800 bg-ink-900 hover:shadow-none hover:translate-y-0">
          <CardHeader className="border-ink-800">
            <CardTitle className="text-bone-50">Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-bone-100">Account active</p>
                <p className="text-xs text-ink-500">Deactivating blocks sign-in immediately.</p>
              </div>
              <Switch checked={!!company.isActive} onCheckedChange={(checked) => setActive.mutate(checked)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-ink-800 bg-ink-900 hover:shadow-none hover:translate-y-0">
          <CardHeader className="border-ink-800">
            <CardTitle className="text-bone-50">Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {COMPANY_MODULES.map((module) => {
              const meta = MODULE_META[module];
              return (
                <div key={module} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-sm text-bone-100">
                    <span className="text-ink-500">{meta.icon}</span>
                    {meta.label}
                  </span>
                  <Switch
                    checked={enabled.has(module)}
                    onCheckedChange={(checked) => toggleModule(module, checked)}
                    disabled={setModules.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <DeleteCompanyDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        companyName={displayName}
        loading={deleteCompany.isPending}
        onConfirm={(confirm) => deleteCompany.mutate(confirm)}
      />
    </div>
  );
}
