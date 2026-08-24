import { Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { DocumentEditor } from './DocumentEditor';
import { Download, Pencil } from 'lucide-react';
import type { AppDocument } from '@/lib/types';

const PdfViewer = lazy(() => import('./PdfViewer').then((m) => ({ default: m.PdfViewer })));

interface DocumentViewerModalProps {
  document: AppDocument | null;
  onClose: () => void;
  onEdit?: (doc: AppDocument) => void;
  apiBase?: string;
}

export function DocumentViewerModal({ document: doc, onClose, onEdit, apiBase = '/documents' }: DocumentViewerModalProps) {
  const isFile = doc?.kind === 'file';

  const { data: viewUrl } = useQuery({
    queryKey: ['document-view-url', apiBase, doc?.id],
    queryFn: () => api.get<{ url: string }>(`${apiBase}/${doc!.id}/view-url`).then((res) => res.data.url),
    enabled: !!doc && isFile,
  });

  const download = async () => {
    if (!doc) return;
    const { data } = await api.get<{ url: string }>(`${apiBase}/${doc.id}/download-url`);
    window.open(data.url, '_blank');
  };

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        {doc && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-4 pr-6">
                <span className="truncate">{doc.title}</span>
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <Button variant="secondary" size="sm" onClick={() => onEdit(doc)}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                  )}
                  {isFile && (
                    <Button variant="secondary" size="sm" onClick={download}>
                      <Download size={14} />
                      Download
                    </Button>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            {doc.kind === 'page' ? (
              <div className="max-h-[65vh] overflow-y-auto">
                <DocumentEditor content={doc.content} editable={false} />
              </div>
            ) : (
              <div className="flex items-center justify-center py-2">
                {!viewUrl ? (
                  <p className="py-12 text-sm text-ink-400">Loading…</p>
                ) : doc.fileType === 'image' ? (
                  <img src={viewUrl} alt={doc.title} className="max-h-[65vh] max-w-full rounded-md object-contain" />
                ) : doc.fileType === 'video' || doc.fileType === 'recording' ? (
                  <video src={viewUrl} controls className="max-h-[65vh] max-w-full rounded-md" />
                ) : doc.fileType === 'pdf' ? (
                  <Suspense fallback={<p className="py-12 text-sm text-ink-400">Loading PDF viewer…</p>}>
                    <PdfViewer file={viewUrl} />
                  </Suspense>
                ) : (
                  <div className="py-12 text-center text-sm text-ink-400">
                    <p className="mb-3">This file type can't be previewed in the app.</p>
                    <Button variant="secondary" size="sm" onClick={download}>
                      <Download size={14} />
                      Download to view
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
