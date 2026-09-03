import { useQuery } from '@tanstack/react-query';
import { ImageOff } from 'lucide-react';
import { fetchStepMedia } from '@/lib/onboarding/api';
import type { AuthRole } from '@/store/auth';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * The image or video an owner attached to one of their steps.
 *
 * Fetched per step rather than with the flow: the URL is presigned for 900s, which is shorter
 * than a tour someone can pause and come back to, so a batch resolved up front would hand out
 * links that die partway through.
 *
 * A missing document is an expected state, not an error — steps live in jsonb with no foreign
 * key, so deleting the document leaves the reference behind. The step renders with a quiet
 * placeholder and stays readable.
 */
export function StudioStepMedia({ stepId, role }: { stepId: string; role: AuthRole | null }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['onboarding', 'media', stepId],
    queryFn: () => fetchStepMedia(role, stepId),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (isError || !data) {
    return (
      <div className="flex h-20 items-center justify-center gap-2 bg-ink-50 text-xs text-ink-400">
        <ImageOff size={14} />
        Attachment unavailable
      </div>
    );
  }

  if (data.fileType === 'video' || data.mimeType?.startsWith('video/')) {
    return <video src={data.url} controls className="max-h-48 w-full bg-ink-950" />;
  }

  return <img src={data.url} alt={data.title} className="max-h-48 w-full object-cover" />;
}
