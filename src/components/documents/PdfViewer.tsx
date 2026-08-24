import { useState } from 'react';
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfViewerProps {
  file: string | { data: Uint8Array };
}

export function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="max-h-[65vh] overflow-y-auto rounded-md border border-ink-200 bg-ink-50">
        <PdfDocument
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<p className="p-8 text-sm text-ink-400">Loading PDF…</p>}
          error={<p className="p-8 text-sm text-terracotta-600">Failed to load PDF.</p>}
        >
          <PdfPage pageNumber={page} width={640} />
        </PdfDocument>
      </div>
      {numPages && numPages > 1 && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs text-ink-500">
            Page {page} of {numPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
