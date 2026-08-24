import { useState } from 'react';
import type { VaultItemRecord, VaultItemContent, VaultItemType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Eye, EyeOff } from 'lucide-react';

export function VaultItemForm({
  editingItem,
  initialContent,
  loading,
  onSubmit,
  onCancel,
}: {
  editingItem: VaultItemRecord | null;
  initialContent: VaultItemContent | null;
  loading: boolean;
  onSubmit: (itemType: VaultItemType, content: VaultItemContent) => void;
  onCancel: () => void;
}) {
  const [itemType, setItemType] = useState<VaultItemType>(editingItem?.itemType ?? 'login');
  const [title, setTitle] = useState(initialContent?.title ?? '');
  const [username, setUsername] = useState(initialContent?.username ?? '');
  const [password, setPassword] = useState(initialContent?.password ?? '');
  const [url, setUrl] = useState(initialContent?.url ?? '');
  const [apiKey, setApiKey] = useState(initialContent?.apiKey ?? '');
  const [notes, setNotes] = useState(initialContent?.notes ?? '');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const content: VaultItemContent = { title: title.trim() };
        if (itemType === 'login') {
          if (username) content.username = username;
          if (password) content.password = password;
          if (url) content.url = url;
        }
        if (itemType === 'api_credential' && apiKey) content.apiKey = apiKey;
        if (notes) content.notes = notes;
        onSubmit(itemType, content);
      }}
    >
      {!editingItem && (
        <div className="space-y-2">
          <Label htmlFor="item-type">Type</Label>
          <Select id="item-type" value={itemType} onChange={(e) => setItemType(e.target.value as VaultItemType)}>
            <option value="login">Login</option>
            <option value="note">Secure Note</option>
            <option value="api_credential">API Credential</option>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="item-title">Title</Label>
        <Input id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Production database" />
      </div>
      {itemType === 'login' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="item-username">Username</Label>
            <Input id="item-username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-password">Password</Label>
            <div className="relative">
              <Input
                id="item-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-url">URL</Label>
            <Input id="item-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </div>
        </>
      )}
      {itemType === 'api_credential' && (
        <div className="space-y-2">
          <Label htmlFor="item-apikey">API Key / Secret</Label>
          <Textarea id="item-apikey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} rows={3} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="item-notes">Notes</Label>
        <Textarea id="item-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading || !title.trim()}>
          {loading ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
}
