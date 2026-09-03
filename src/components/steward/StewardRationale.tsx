import { Link } from 'react-router-dom';
import type { StewardRationaleSegment } from '@/lib/types';

type CitationSegment = Extract<StewardRationaleSegment, { type: 'citation' }>;

/** Only `task` citations become real links — `/tasks?task=<id>` is the one entity type with an
 *  existing safe, read-only deep-link target (`Tasks.tsx`'s `detailTask` dialog). Projects,
 *  invoices, clients, and employees have no equivalent read-only detail view today (their list
 *  pages only support deep-linking straight into an *edit* dialog), so citing one of those
 *  renders as styled reference text rather than a link that would surprise the owner by opening
 *  an editor they never asked for. */
function citationHref(entityType: CitationSegment['entityType'], entityId: string): string | null {
  if (entityType === 'task') return `/tasks?task=${entityId}`;
  return null;
}

export function StewardRationale({ segments }: { segments: StewardRationaleSegment[] }) {
  return (
    <p className="text-sm leading-relaxed text-ink-600">
      {segments.map((segment, i) => {
        if (segment.type === 'text') return <span key={i}>{segment.value}</span>;

        const href = citationHref(segment.entityType, segment.entityId);
        if (href) {
          return (
            <Link key={i} to={href} className="font-medium text-brass-700 underline decoration-brass-300 underline-offset-2 hover:text-brass-800">
              {segment.label}
            </Link>
          );
        }
        return (
          <span key={i} className="font-medium text-pine-800">
            {segment.label}
          </span>
        );
      })}
    </p>
  );
}
