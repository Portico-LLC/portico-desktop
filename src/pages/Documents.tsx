import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { AppDocument, Project } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { QuotaIndicator } from '@/components/documents/QuotaIndicator';
import { DocumentFilterBar, type DocumentFilterState } from '@/components/documents/DocumentFilterBar';
import { DocumentEditor } from '@/components/documents/DocumentEditor';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { UploadDropzone } from '@/components/documents/UploadDropzone';
import { TagEditor } from '@/components/documents/TagEditor';
import { TagChip } from '@/components/documents/TagChip';
import { RecorderController } from '@/components/recorder/RecorderController';
import {
  Search,
  Plus,
  Upload,
  FileStack,
  FileText,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Trash2,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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

export function Documents() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DocumentFilterState>(EMPTY_FILTERS);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<AppDocument | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [metaDialogDoc, setMetaDialogDoc] = useState<AppDocument | null>(null);
  const [viewerDoc, setViewerDoc] = useState<AppDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<AppDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', filters],
    queryFn: () =>
      api
        .get<AppDocument[]>('/documents', {
          params: {
            projectId: filters.projectId || undefined,
            tag: filters.tag || undefined,
            type: filters.type || undefined,
          },
        })
        .then((res) => res.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
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

  const savePage = useMutation({
    mutationFn: async (payload: { id?: string; title: string; projectId?: string; tags?: string[]; content: unknown }) => {
      if (payload.id) {
        return api.patch(`/documents/pages/${payload.id}`, {
          title: payload.title,
          projectId: payload.projectId || undefined,
          tags: payload.tags,
          content: payload.content,
        });
      }
      return api.post('/documents/pages', {
        title: payload.title,
        projectId: payload.projectId || undefined,
        tags: payload.tags,
        content: payload.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setPageDialogOpen(false);
      setEditingPage(null);
    },
    meta: { successMessage: 'Page saved', suppressErrorToast: true },
  });

  const saveMeta = useMutation({
    mutationFn: (payload: { id: string; title: string; projectId?: string; tags?: string[] }) =>
      api.patch(`/documents/${payload.id}/meta`, {
        title: payload.title,
        projectId: payload.projectId || undefined,
        tags: payload.tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setMetaDialogDoc(null);
    },
    meta: { successMessage: 'Document updated', suppressErrorToast: true },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-quota'] });
      setDeleteDoc(null);
    },
    meta: { successMessage: 'Document deleted', errorTitle: 'Could not delete document' },
  });

  const openEdit = (doc: AppDocument) => {
    setViewerDoc(null);
    if (doc.kind === 'page') {
      setEditingPage(doc);
      setPageDialogOpen(true);
    } else {
      setMetaDialogDoc(doc);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-4xl font-display font-semibold text-ink-900 mb-2">
            <FileStack size={30} className="text-pine-700" />
            Documents
          </h1>
          <p className="text-ink-500">Written pages, images, videos, and PDFs — organized per project.</p>
        </div>
        <div className="flex items-center gap-4">
          <QuotaIndicator />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditingPage(null);
                setPageDialogOpen(true);
              }}
            >
              <Plus size={18} />
              New Page
            </Button>
            <Button variant="secondary" onClick={() => setUploadDialogOpen(true)}>
              <Upload size={18} />
              Upload
            </Button>
            <RecorderController
              deepLinkToPanelOnElectron
              projects={projects}
              defaultProjectId={filters.projectId || undefined}
              renderTrigger={(open) => (
                <Button variant="primary" onClick={open}>
                  <Video size={18} />
                  Record
                </Button>
              )}
            />
          </div>
        </div>
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
          <p className="text-sm text-ink-400">No documents yet. Write a page or upload a file to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="group cursor-pointer p-4" onClick={() => setViewerDoc(doc)}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm bg-ink-100">
                  <DocIcon doc={doc} />
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(doc);
                    }}
                    className="rounded-sm p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDoc(doc);
                    }}
                    className="rounded-sm p-1.5 text-ink-400 hover:bg-terracotta-100 hover:text-terracotta-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mb-1 truncate text-sm font-medium text-ink-900">{doc.title}</p>
              <p className="mb-2 text-xs text-ink-400">
                {doc.project?.name ?? 'No project'}
                {doc.durationSeconds ? ` · ${formatDuration(doc.durationSeconds)}` : ''}
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

      {/* New / edit page */}
      <Dialog
        open={pageDialogOpen}
        onOpenChange={(open) => {
          setPageDialogOpen(open);
          if (!open) setEditingPage(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPage ? 'Edit Page' : 'New Page'}</DialogTitle>
          </DialogHeader>
          <PageForm
            key={editingPage?.id ?? 'new'}
            doc={editingPage}
            projects={projects}
            loading={savePage.isPending}
            error={savePage.error ? getErrorMessage(savePage.error) : null}
            onCancel={() => setPageDialogOpen(false)}
            onSubmit={(payload) => savePage.mutate({ id: editingPage?.id, ...payload })}
          />
        </DialogContent>
      </Dialog>

      {/* Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
          </DialogHeader>
          <UploadForm projects={projects} onClose={() => setUploadDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit metadata (title / project / tags) for a file */}
      <Dialog open={!!metaDialogDoc} onOpenChange={(open) => !open && setMetaDialogDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
          </DialogHeader>
          {metaDialogDoc && (
            <MetaForm
              doc={metaDialogDoc}
              projects={projects}
              loading={saveMeta.isPending}
              error={saveMeta.error ? getErrorMessage(saveMeta.error) : null}
              onCancel={() => setMetaDialogDoc(null)}
              onSubmit={(payload) => saveMeta.mutate({ id: metaDialogDoc.id, ...payload })}
            />
          )}
        </DialogContent>
      </Dialog>

      <DocumentViewerModal document={viewerDoc} onClose={() => setViewerDoc(null)} onEdit={openEdit} />

      <ConfirmDeleteDialog
        open={!!deleteDoc}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
        title="Delete document"
        description={`This will permanently remove "${deleteDoc?.title}". This action cannot be undone.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteDoc && deleteMutation.mutate(deleteDoc.id)}
      />
    </div>
  );
}

function PageForm({
  doc,
  projects,
  loading,
  error,
  onCancel,
  onSubmit,
}: {
  doc: AppDocument | null;
  projects: Project[];
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (payload: { title: string; projectId?: string; tags?: string[]; content: unknown }) => void;
}) {
  const [title, setTitle] = useState(doc?.title ?? '');
  const [projectId, setProjectId] = useState(doc?.projectId ?? '');
  const [tags, setTags] = useState<string[]>(doc?.tags ?? []);
  const [content, setContent] = useState<unknown>(doc?.content ?? {});

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onSubmit({ title: title.trim(), projectId: projectId || undefined, tags, content });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="page-title">Title</Label>
        <Input id="page-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled page" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="page-project">Project</Label>
        <Select id="page-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagEditor tags={tags} onChange={setTags} />
      </div>
      <div className="space-y-2">
        <Label>Content</Label>
        <DocumentEditor content={content} onChange={setContent} />
      </div>
      {error && <p className="text-xs text-terracotta-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading || !title.trim()}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function MetaForm({
  doc,
  projects,
  loading,
  error,
  onCancel,
  onSubmit,
}: {
  doc: AppDocument;
  projects: Project[];
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (payload: { title: string; projectId?: string; tags?: string[] }) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [projectId, setProjectId] = useState(doc.projectId ?? '');
  const [tags, setTags] = useState<string[]>(doc.tags ?? []);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onSubmit({ title: title.trim(), projectId: projectId || undefined, tags });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="meta-title">Title</Label>
        <Input id="meta-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meta-project">Project</Label>
        <Select id="meta-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagEditor tags={tags} onChange={setTags} />
      </div>
      {error && <p className="text-xs text-terracotta-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading || !title.trim()}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function UploadForm({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="upload-project">Project</Label>
        <Select id="upload-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagEditor tags={tags} onChange={setTags} />
      </div>
      <UploadDropzone projectId={projectId || undefined} tags={tags} />
      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
