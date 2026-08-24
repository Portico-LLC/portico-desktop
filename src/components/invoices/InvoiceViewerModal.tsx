import { Suspense, lazy, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import type { Invoice } from '@/lib/types';

const PdfViewer = lazy(() => import('@/components/documents/PdfViewer').then((m) => ({ default: m.PdfViewer })));

interface InvoiceViewerModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export function InvoiceViewerModal({ invoice, onClose }: InvoiceViewerModalProps) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice) {
      setPdfBytes(null);
      return;
    }
    let cancelled = false;
    setError(null);
    setPdfBytes(null);
    api
      .get(`/invoices/${invoice.id}/pdf`, { responseType: 'arraybuffer' })
      .then((res) => {
        if (!cancelled) setPdfBytes(new Uint8Array(res.data as ArrayBuffer));
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load the invoice PDF.');
      });
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  const download = () => {
    if (!pdfBytes || !invoice) return;
    const url = URL.createObjectURL(new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-4 pr-6">
                <span>{invoice.invoiceNumber}</span>
                <Button variant="secondary" size="sm" onClick={download} disabled={!pdfBytes}>
                  <Download size={14} />
                  Download
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-2">
              {error ? (
                <p className="py-12 text-sm text-terracotta-600">{error}</p>
              ) : !pdfBytes ? (
                <p className="py-12 text-sm text-ink-400">Loading…</p>
              ) : (
                <Suspense fallback={<p className="py-12 text-sm text-ink-400">Loading PDF viewer…</p>}>
                  <PdfViewer file={{ data: pdfBytes }} />
                </Suspense>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
