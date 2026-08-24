import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DocumentQuota } from '@/lib/types';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 0.1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export function QuotaIndicator({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ['documents-quota'],
    queryFn: () => api.get<DocumentQuota>('/documents/quota').then((res) => res.data),
  });

  if (!data) return null;

  const pct = data.limitBytes > 0 ? Math.min(100, (data.usedBytes / data.limitBytes) * 100) : 0;
  const isNearLimit = pct >= 90;

  return (
    <div className={cn('flex flex-col gap-1 min-w-[180px]', className)}>
      <div className="flex items-center justify-between text-xs text-ink-500">
        <span>Storage</span>
        <span>
          {formatBytes(data.usedBytes)} of {formatBytes(data.limitBytes)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div
          className={cn('h-full rounded-full transition-all', isNearLimit ? 'bg-terracotta-500' : 'bg-pine-700')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
