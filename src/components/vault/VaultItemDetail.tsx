import { useState } from 'react';
import type { VaultItemContent } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Copy, Check, Eye, EyeOff, Trash2 } from 'lucide-react';

function FieldRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-sm border border-ink-200 bg-ink-50 px-3 py-2 text-sm">{value}</code>
        <Button variant="ghost" size="icon" onClick={onCopy}>
          {copied ? <Check size={15} className="text-moss-600" /> : <Copy size={15} />}
        </Button>
      </div>
    </div>
  );
}

export function VaultItemDetail({
  content,
  onEdit,
  onDelete,
}: {
  content: VaultItemContent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState(false);

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-4">
      {content.username && (
        <FieldRow label="Username" value={content.username} onCopy={() => copy('username', content.username!)} copied={copied === 'username'} />
      )}
      {content.password && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Password</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-sm border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
              {revealPassword ? content.password : '••••••••••••'}
            </code>
            <Button variant="ghost" size="icon" onClick={() => setRevealPassword((v) => !v)}>
              {revealPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => copy('password', content.password!)}>
              {copied === 'password' ? <Check size={15} className="text-moss-600" /> : <Copy size={15} />}
            </Button>
          </div>
        </div>
      )}
      {content.url && (
        <FieldRow label="URL" value={content.url} onCopy={() => copy('url', content.url!)} copied={copied === 'url'} />
      )}
      {content.apiKey && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">API Key / Secret</p>
          <div className="flex items-start gap-2">
            <code className="flex-1 whitespace-pre-wrap break-all rounded-sm border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
              {content.apiKey}
            </code>
            <Button variant="ghost" size="icon" onClick={() => copy('apiKey', content.apiKey!)}>
              {copied === 'apiKey' ? <Check size={15} className="text-moss-600" /> : <Copy size={15} />}
            </Button>
          </div>
        </div>
      )}
      {content.notes && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Notes</p>
          <p className="whitespace-pre-wrap text-sm text-ink-700">{content.notes}</p>
        </div>
      )}
      <div className="flex justify-end gap-3 border-t border-ink-200 pt-4">
        <Button variant="ghost" className="text-terracotta-600 hover:bg-terracotta-100" onClick={onDelete}>
          <Trash2 size={14} />
          Delete
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}
