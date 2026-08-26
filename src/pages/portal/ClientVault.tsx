import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useVaultStore } from '@/store/vault';
import { unwrapVaultKey, encryptJson, decryptJson } from '@/lib/vaultCrypto';
import type { VaultSummary, VaultMemberSummary, VaultItemRecord, VaultItemContent, VaultAuditLogEntry } from '@/lib/types';
import { VaultUnlockGate } from '@/components/vault/VaultUnlockGate';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Shield, Lock, Plus, KeyRound, StickyNote, Terminal, History, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

const ITEM_TYPE_ICON = { login: <KeyRound size={16} />, note: <StickyNote size={16} />, api_credential: <Terminal size={16} /> };

export function ClientVault() {
  return (
    <VaultUnlockGate apiBase="/client/vault">
      <ClientVaultWorkspace />
    </VaultUnlockGate>
  );
}

function ClientVaultWorkspace() {
  const queryClient = useQueryClient();
  const privateKey = useVaultStore((s) => s.privateKey);
  const vaultKeys = useVaultStore((s) => s.vaultKeys);
  const setVaultKeyInStore = useVaultStore((s) => s.setVaultKey);

  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<Map<string, VaultItemContent>>(new Map());
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  const { data: vaults = [], isLoading: vaultsLoading } = useQuery({
    queryKey: ['client-vaults'],
    queryFn: () => api.get<VaultSummary[]>('/client/vault/vaults').then((res) => res.data),
  });

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) ?? null;
  const vaultKey = selectedVaultId ? vaultKeys.get(selectedVaultId) : undefined;

  const { data: members = [] } = useQuery({
    queryKey: ['client-vault-members', selectedVaultId],
    queryFn: () => api.get<VaultMemberSummary[]>(`/client/vault/vaults/${selectedVaultId}/members`).then((res) => res.data),
    enabled: !!selectedVaultId,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['client-vault-items', selectedVaultId],
    queryFn: () => api.get<VaultItemRecord[]>(`/client/vault/vaults/${selectedVaultId}/items`).then((res) => res.data),
    enabled: !!selectedVaultId,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['client-vault-audit-log', selectedVaultId],
    queryFn: () => api.get<VaultAuditLogEntry[]>(`/client/vault/vaults/${selectedVaultId}/audit-log`).then((res) => res.data),
    enabled: auditLogOpen && !!selectedVaultId,
  });

  useEffect(() => {
    if (!selectedVaultId && vaults.length > 0) setSelectedVaultId(vaults[0].id);
  }, [vaults, selectedVaultId]);

  useEffect(() => {
    if (!selectedVault || !privateKey || vaultKeys.has(selectedVault.id)) return;
    unwrapVaultKey(selectedVault.wrappedVaultKey, privateKey).then((key) => setVaultKeyInStore(selectedVault.id, key));
  }, [selectedVault, privateKey, vaultKeys, setVaultKeyInStore]);

  useEffect(() => {
    if (!vaultKey || items.length === 0) {
      setDecryptedItems(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        items.map(async (item) => {
          try {
            return [item.id, await decryptJson<VaultItemContent>(item, vaultKey)] as const;
          } catch {
            return [item.id, { title: '(unable to decrypt)' }] as const;
          }
        }),
      );
      if (!cancelled) setDecryptedItems(new Map(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [items, vaultKey]);

  const saveItem = useMutation({
    mutationFn: async (content: VaultItemContent) => {
      if (!vaultKey) throw new Error('Vault is locked');
      const { ciphertext, iv } = await encryptJson(vaultKey, content);
      return api.post(`/client/vault/vaults/${selectedVaultId}/items`, { itemType: 'note', ciphertext, iv });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-vault-items', selectedVaultId] });
      setItemDialogOpen(false);
    },
    meta: { successMessage: 'Item saved', errorTitle: 'Could not save item' },
  });

  const detailContent = detailItemId ? decryptedItems.get(detailItemId) ?? null : null;

  if (vaults.length === 0 && !vaultsLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-4xl font-display font-semibold text-ink-900 mb-2">
            <Shield size={30} className="text-pine-700" />
            Vault
          </h1>
          <p className="text-ink-500">Your studio hasn't shared any vaults with you yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-4xl font-display font-semibold text-ink-900 mb-2">
          <Shield size={30} className="text-pine-700" />
          Vault
        </h1>
        <p className="text-ink-500">Secrets shared with you by your studio, end-to-end encrypted.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-260px)] min-h-[480px]">
          <div className="w-64 border-r border-ink-200 flex flex-col flex-shrink-0 bg-ink-50/50">
            <div className="flex-1 overflow-y-auto">
              {vaultsLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                vaults.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVaultId(v.id)}
                    className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors border-b border-ink-100 ${
                      v.id === selectedVaultId ? 'bg-bone-50 font-medium text-ink-900' : 'text-ink-600 hover:bg-bone-50/60'
                    }`}
                  >
                    <Lock size={14} className="flex-shrink-0 text-ink-400" />
                    <span className="truncate">{v.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {!selectedVault || !vaultKey ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-ink-400">{selectedVault ? 'Unlocking…' : 'Select a vault.'}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-ink-200 bg-ink-50/50">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-ink-900">{selectedVault.name}</p>
                    <div className="flex -space-x-2">
                      {members.slice(0, 5).map((m) => (
                        <Avatar key={m.id} name={m.name} size="sm" className="ring-2 ring-bone-50" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAuditLogOpen(true)}>
                      <History size={14} />
                      Audit Log
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setItemDialogOpen(true)}>
                      <Plus size={14} />
                      New Note
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {itemsLoading ? (
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="py-12 text-center text-sm text-ink-400">No items in this vault yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => {
                        const content = decryptedItems.get(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => setDetailItemId(item.id)}
                            className="flex w-full items-center gap-3 rounded-md border border-ink-200 bg-bone-50 px-4 py-3 text-left transition-colors hover:border-ink-300 hover:bg-ink-50"
                          >
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-ink-100 text-ink-600">
                              {ITEM_TYPE_ICON[item.itemType]}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink-900">{content?.title ?? '…'}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
          </DialogHeader>
          <ClientItemForm loading={saveItem.isPending} onCancel={() => setItemDialogOpen(false)} onSubmit={(c) => saveItem.mutate(c)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailItemId} onOpenChange={(open) => !open && setDetailItemId(null)}>
        <DialogContent>
          {detailContent && (
            <>
              <DialogHeader>
                <DialogTitle>{detailContent.title}</DialogTitle>
              </DialogHeader>
              <ClientItemDetail content={detailContent} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={auditLogOpen} onOpenChange={setAuditLogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log — {selectedVault?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {auditLog.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">No activity yet.</p>
            ) : (
              auditLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
                  <span className="capitalize text-ink-700">{entry.principalType} — {entry.action.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-ink-400">{format(new Date(entry.createdAt), 'MMM d, h:mm a')}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientItemForm({
  loading,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  onSubmit: (content: VaultItemContent) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({ title: title.trim(), notes: notes || undefined });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="client-item-title">Title</Label>
        <Input id="client-item-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-item-notes">Notes</Label>
        <Textarea id="client-item-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading || !title.trim()}>
          {loading ? 'Saving…' : 'Add Note'}
        </Button>
      </div>
    </form>
  );
}

function ClientItemDetail({ content }: { content: VaultItemContent }) {
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);

  return (
    <div className="space-y-4">
      {content.password && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Password</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-sm border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
              {reveal ? content.password : '••••••••••••'}
            </code>
            <Button variant="ghost" size="icon" onClick={() => setReveal((v) => !v)}>
              {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(content.password!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check size={15} className="text-moss-600" /> : <Copy size={15} />}
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
    </div>
  );
}
