import { Suspense, lazy, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { VideoPlayer } from './VideoPlayer';
import { ImageLightbox } from './ImageLightbox';
import { useAttachmentUrl, fetchDownloadUrl, formatBytes, formatDuration } from './useAttachmentUrl';
import type { ChatAttachment } from '@/lib/types';
import { FileText, FileArchive, File as FileIcon, Download, Music, Loader2 } from 'lucide-react';

// Reuses the documents module's PDF viewer verbatim — it already takes a URL string, and
// lazy so pdfjs stays out of the main chat bundle.
const PdfViewer = lazy(() => import('@/components/documents/PdfViewer').then((m) => ({ default: m.PdfViewer })));

function iconFor(attachment: ChatAttachment) {
  if (attachment.fileType === 'pdf') return FileText;
  if (attachment.fileType === 'audio') return Music;
  if (/zip|tar|rar|7z|gz/.test(attachment.mimeType)) return FileArchive;
  return FileIcon;
}

/** Non-previewable files, and the fallback whenever a preview can't render. */
function FileCard({ apiBase, attachment }: { apiBase: string; attachment: ChatAttachment }) {
  const [busy, setBusy] = useState(false);
  const Icon = iconFor(attachment);

  const download = async () => {
    setBusy(true);
    try {
      window.open(await fetchDownloadUrl(apiBase, attachment.id), '_blank');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-sm items-center gap-3 rounded-md border border-ink-200 bg-surface px-3 py-2.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-ink-100 text-ink-500">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">{attachment.filename}</p>
        <p className="text-[11px] text-ink-400">
          {formatBytes(attachment.sizeBytes)}
          {attachment.durationSeconds ? ` · ${formatDuration(attachment.durationSeconds)}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        aria-label={`Download ${attachment.filename}`}
        className="rounded-sm p-2 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>
    </div>
  );
}

function ImageTile({
  apiBase,
  attachment,
  onOpen,
  solo,
}: {
  apiBase: string;
  attachment: ChatAttachment;
  onOpen: () => void;
  solo: boolean;
}) {
  const { data: url, isLoading, isError } = useAttachmentUrl(apiBase, attachment.id);
  // Reserve the real aspect ratio up front so the thread doesn't jump as images decode.
  const ratio = attachment.width && attachment.height ? attachment.width / attachment.height : 4 / 3;

  if (isError) return <FileCard apiBase={apiBase} attachment={attachment} />;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative overflow-hidden rounded-md border border-ink-200 bg-ink-50',
        'transition-shadow duration-hover ease-brand hover:shadow-sm',
        solo ? 'max-w-sm' : 'w-full',
      )}
      style={{ aspectRatio: solo ? String(Math.max(ratio, 0.6)) : '1' }}
      aria-label={`Open ${attachment.filename}`}
    >
      {isLoading || !url ? (
        <span className="flex h-full w-full items-center justify-center">
          <Loader2 size={18} className="animate-spin text-ink-300" />
        </span>
      ) : (
        <img
          src={url}
          alt={attachment.filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-transition ease-brand group-hover:scale-[1.02]"
        />
      )}
    </button>
  );
}

function VideoAttachment({ apiBase, attachment }: { apiBase: string; attachment: ChatAttachment }) {
  const { data: url, isLoading, isError } = useAttachmentUrl(apiBase, attachment.id);
  const ratio = attachment.width && attachment.height ? attachment.width / attachment.height : 16 / 9;

  if (isError) return <FileCard apiBase={apiBase} attachment={attachment} />;
  if (isLoading || !url) {
    return (
      <div
        className="flex max-w-md items-center justify-center rounded-lg border border-ink-200 bg-ink-50"
        style={{ aspectRatio: String(ratio) }}
      >
        <Loader2 size={20} className="animate-spin text-ink-300" />
      </div>
    );
  }
  return <VideoPlayer src={url} aspectRatio={ratio} className="max-w-md" />;
}

function AudioAttachment({ apiBase, attachment }: { apiBase: string; attachment: ChatAttachment }) {
  const { data: url } = useAttachmentUrl(apiBase, attachment.id);
  return (
    <div className="max-w-sm rounded-md border border-ink-200 bg-surface px-3 py-2.5">
      <p className="mb-1.5 truncate text-sm font-medium text-ink-900">{attachment.filename}</p>
      {/* The native audio transport is genuinely fine and consistent across platforms —
          unlike the video one, it isn't worth replacing. */}
      {url ? <audio src={url} controls className="w-full" /> : <div className="h-8 animate-pulse rounded-sm bg-ink-100" />}
    </div>
  );
}

function PdfAttachment({ apiBase, attachment }: { apiBase: string; attachment: ChatAttachment }) {
  const [open, setOpen] = useState(false);
  const { data: url } = useAttachmentUrl(apiBase, attachment.id, open);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex max-w-sm items-center gap-3 rounded-md border border-ink-200 bg-surface px-3 py-2.5 text-left transition-colors duration-hover ease-brand hover:border-ink-300 hover:bg-ink-50"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-terracotta-50 text-terracotta-600">
          <FileText size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{attachment.filename}</p>
          <p className="text-[11px] text-ink-400">{formatBytes(attachment.sizeBytes)} · PDF</p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4 pr-6">
              <span className="truncate">{attachment.filename}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => window.open(await fetchDownloadUrl(apiBase, attachment.id), '_blank')}
              >
                <Download size={14} />
                Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-2">
            {!url ? (
              <p className="py-12 text-sm text-ink-400">Loading…</p>
            ) : (
              <Suspense fallback={<p className="py-12 text-sm text-ink-400">Loading PDF viewer…</p>}>
                <PdfViewer file={url} />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Renders a message's attachments, dispatching on type.
 *
 * `galleryImages` is the full set of images in the conversation rather than just this
 * message's, so paging with the arrow keys walks the whole thread the way an image viewer
 * should.
 */
export function AttachmentGrid({
  apiBase,
  attachments,
  galleryImages,
}: {
  apiBase: string;
  attachments: ChatAttachment[];
  galleryImages?: ChatAttachment[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (!attachments.length) return null;

  const images = attachments.filter((a) => a.fileType === 'image');
  const others = attachments.filter((a) => a.fileType !== 'image');
  const gallery = galleryImages?.length ? galleryImages : images;

  return (
    <div className="mt-1.5 space-y-2">
      {images.length > 0 && (
        <div
          className={cn(
            images.length === 1 ? 'flex' : 'grid gap-1.5',
            images.length === 2 && 'max-w-md grid-cols-2',
            images.length >= 3 && 'max-w-md grid-cols-3',
          )}
        >
          {images.map((attachment) => (
            <ImageTile
              key={attachment.id}
              apiBase={apiBase}
              attachment={attachment}
              solo={images.length === 1}
              onOpen={() => setLightboxIndex(Math.max(0, gallery.findIndex((g) => g.id === attachment.id)))}
            />
          ))}
        </div>
      )}

      {others.map((attachment) => {
        if (attachment.fileType === 'video') return <VideoAttachment key={attachment.id} apiBase={apiBase} attachment={attachment} />;
        if (attachment.fileType === 'audio') return <AudioAttachment key={attachment.id} apiBase={apiBase} attachment={attachment} />;
        if (attachment.fileType === 'pdf') return <PdfAttachment key={attachment.id} apiBase={apiBase} attachment={attachment} />;
        return <FileCard key={attachment.id} apiBase={apiBase} attachment={attachment} />;
      })}

      {lightboxIndex !== null && (
        <ImageLightbox
          apiBase={apiBase}
          images={gallery}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

export { FileCard };
