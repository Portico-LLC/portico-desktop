import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AppDocument, Project } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { DocumentFilterBar, type DocumentFilterState } from '@/components/documents/DocumentFilterBar';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { TagChip } from '@/components/documents/TagChip';
import { Search, FileStack, FileText, Image as ImageIcon, Video, File as FileIcon } from 'lucide-react';
import { format } from 'date-fns';

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocIcon({ doc }: { doc: AppDocument }) {
  if (doc.kind === 'page') return <FileText size={20} className="text-pine-700" />;
  switch (doc.fileType) {
    case 'image':
      return <ImageIcon size={20} className="text-brass-700" />;
    case 'video':
      return <Video size={20} className="text-terracotta-600" />;
    case 'recording':
      return <Video size={20} className="text-pine-700" />;
    case 'pdf':
      return <FileText size={20} className="text-steel-600" />;
    default:
      return <FileIcon size={20} className="text-ink-500" />;
  }
}

const EMPTY_FILTERS: DocumentFilterState = { projectId: '', tag: '', type: '' };

export function ClientDocuments() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DocumentFilterState>(EMPTY_FILTERS);
  const [viewerDoc, setViewerDoc] = useState<AppDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-documents', filters],
    queryFn: () =>
      api
        .get<AppDocument[]>('/client/documents', {
          params: {
            projectId: filters.projectId || undefined,
            tag: filters.tag || undefined,
            type: filters.type || undefined,
          },
        })
        .then((res) => res.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['client-projects'],
    queryFn: () => api.get<Project[]>('/client/projects').then((res) => res.data),
  });

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => (d.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.trim().toLowerCase();
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, search]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-4xl font-display font-semibold text-ink-900 mb-2">
          <FileStack size={30} className="text-pine-700" />
          Documents
        </h1>
        <p className="text-ink-500">Pages, images, videos, and PDFs shared with you by your studio.</p>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
          <Input placeholder="Search documents..." className="pl-10 w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <DocumentFilterBar filters={filters} onChange={setFilters} projects={projects} availableTags={availableTags} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center">
          <FileStack className="mx-auto mb-3 h-10 w-10 text-ink-200" />
          <p className="text-sm text-ink-400">Your studio hasn't shared any documents with you yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="cursor-pointer p-4" onClick={() => setViewerDoc(doc)}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-sm bg-ink-100">
                <DocIcon doc={doc} />
              </div>
              <p className="mb-1 truncate text-sm font-medium text-ink-900">{doc.title}</p>
              <p className="mb-2 text-xs text-ink-400">
                {doc.project?.name ?? 'No project'}
                {doc.sizeBytes ? ` · ${formatSize(doc.sizeBytes)}` : ''} · {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
              </p>
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {doc.tags.slice(0, 3).map((tag) => (
                    <TagChip key={tag} label={tag} />
                  ))}
                  {doc.tags.length > 3 && <span className="text-xs text-ink-400">+{doc.tags.length - 3}</span>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <DocumentViewerModal document={viewerDoc} onClose={() => setViewerDoc(null)} apiBase="/client/documents" />
    </div>
  );
}
