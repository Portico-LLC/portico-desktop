import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useVaultStore } from '@/store/vault';
import { unwrapVaultKey, wrapVaultKeyForRecipient, generateVaultKey, encryptJson, decryptJson } from '@/lib/vaultCrypto';
import type {
  VaultSummary,
  VaultMemberSummary,
  VaultItemRecord,
  VaultItemContent,
  VaultItemType,
  VaultCandidate,
  VaultAuditLogEntry,
  VaultIdentityRecord,
} from '@/lib/types';
import { VaultUnlockGate } from '@/components/vault/VaultUnlockGate';
import { VaultItemForm } from '@/components/vault/VaultItemForm';
import { VaultItemDetail } from '@/components/vault/VaultItemDetail';
import { ITEM_TYPE_META } from '@/components/vault/vaultItemMeta';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Lock, Plus, Shield, UserPlus, History, X } from 'lucide-react';
import { format } from 'date-fns';

export function Vault() {
  return (
    <VaultUnlockGate apiBase="/vault">
      <VaultWorkspace />
    </VaultUnlockGate>
  );
}

function VaultWorkspace() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const isOwner = role === 'user';
  const privateKey = useVaultStore((s) => s.privateKey);
  const vaultKeys = useVaultStore((s) => s.vaultKeys);
  const setVaultKeyInStore = useVaultStore((s) => s.setVaultKey);

  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<Map<string, VaultItemContent>>(new Map());
  const [newVaultOpen, setNewVaultOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemRecord | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  const { data: identity } = useQuery({
    queryKey: ['vault-identity', '/vault'],
    queryFn: () => api.get<VaultIdentityRecord>('/vault/identity').then((res) => res.data),
  });

  const { data: vaults = [], isLoading: vaultsLoading } = useQuery({
    queryKey: ['vaults'],
    queryFn: () => api.get<VaultSummary[]>('/vault/vaults').then((res) => res.data),
  });

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) ?? null;
  const vaultKey = selectedVaultId ? vaultKeys.get(selectedVaultId) : undefined;

  const { data: members = [] } = useQuery({
    queryKey: ['vault-members', selectedVaultId],
    queryFn: () => api.get<VaultMemberSummary[]>(`/vault/vaults/${selectedVaultId}/members`).then((res) => res.data),
    enabled: !!selectedVaultId,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['vault-items', selectedVaultId],
    queryFn: () => api.get<VaultItemRecord[]>(`/vault/vaults/${selectedVaultId}/items`).then((res) => res.data),
    enabled: !!selectedVaultId,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['vault-candidates'],
    queryFn: () => api.get<VaultCandidate[]>('/vault/candidates').then((res) => res.data),
    enabled: addMemberOpen,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['vault-audit-log', selectedVaultId],
    queryFn: () => api.get<VaultAuditLogEntry[]>(`/vault/vaults/${selectedVaultId}/audit-log`).then((res) => res.data),
    enabled: auditLogOpen && !!selectedVaultId,
  });

  useEffect(() => {
    if (!selectedVaultId && vaults.length > 0) setSelectedVaultId(vaults[0].id);
  }, [vaults, selectedVaultId]);

  // Unwrap the selected vault's AES key with our own already-unlocked private key.
  useEffect(() => {
    if (!selectedVault || !privateKey || vaultKeys.has(selectedVault.id)) return;
    unwrapVaultKey(selectedVault.wrappedVaultKey, privateKey).then((key) => setVaultKeyInStore(selectedVault.id, key));
  }, [selectedVault, privateKey, vaultKeys, setVaultKeyInStore]);

  // Decrypt every item's content client-side once the vault key is available.
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
            const content = await decryptJson<VaultItemContent>(item, vaultKey);
            return [item.id, content] as const;
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

  const createVault = useMutation({
    mutationFn: async (name: string) => {
      if (!identity) throw new Error('Vault identity not ready');
      const vaultKeyToWrap = await generateVaultKey();
      const wrappedVaultKey = await wrapVaultKeyForRecipient(vaultKeyToWrap, identity.publicKey);
      const vault = await api.post<VaultSummary>('/vault/vaults', { name, wrappedVaultKey }).then((res) => res.data);
      setVaultKeyInStore(vault.id, vaultKeyToWrap);
      return vault;
    },
    onSuccess: (vault) => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      setSelectedVaultId(vault.id);
      setNewVaultOpen(false);
    },
  });

  const addMember = useMutation({
    mutationFn: async (candidate: VaultCandidate) => {
      if (!selectedVaultId || !vaultKey) throw new Error('No vault selected');
      const { publicKey } = await api
        .get<{ publicKey: string }>(`/vault/identity/${candidate.type}/${candidate.id}/public-key`)
        .then((res) => res.data);
      const wrappedVaultKey = await wrapVaultKeyForRecipient(vaultKey, publicKey);
      return api.post(`/vault/vaults/${selectedVaultId}/members`, {
        principalType: candidate.type,
        principalId: candidate.id,
        wrappedVaultKey,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vault-members', selectedVaultId] }),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => api.delete(`/vault/vaults/${selectedVaultId}/members/${memberId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vault-members', selectedVaultId] }),
  });

  const saveItem = useMutation({
    mutationFn: async ({ itemType, content, id }: { itemType: VaultItemType; content: VaultItemContent; id?: string }) => {
      if (!vaultKey) throw new Error('Vault is locked');
      const { ciphertext, iv } = await encryptJson(vaultKey, content);
      if (id) return api.patch(`/vault/items/${id}`, { ciphertext, iv });
      return api.post(`/vault/vaults/${selectedVaultId}/items`, { itemType, ciphertext, iv });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items', selectedVaultId] });
      setItemDialogOpen(false);
      setEditingItem(null);
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/vault/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items', selectedVaultId] });
      setDeleteItemId(null);
    },
  });

  const existingMemberKeys = new Set(members.map((m) => `${m.principalType}:${m.principalId}`));
  const detailItem = detailItemId ? items.find((i) => i.id === detailItemId) ?? null : null;
  const detailContent = detailItemId ? decryptedItems.get(detailItemId) ?? null : null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-4xl font-display font-semibold text-ink-900 mb-2">
            <Shield size={30} className="text-pine-700" />
            Vault
          </h1>
          <p className="text-ink-500">End-to-end encrypted secrets, shared only with people you choose.</p>
        </div>
        {isOwner && (
          <Button variant="primary" onClick={() => setNewVaultOpen(true)}>
            <Plus size={18} />
            New Vault
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-260px)] min-h-[480px]">
          <div className="w-64 border-r border-ink-200 flex flex-col flex-shrink-0 bg-ink-50/50">
            <div className="flex-1 overflow-y-auto">
              {vaultsLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : vaults.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-400">
                  <Lock className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                  No vaults yet.
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
            {!selectedVault ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-ink-400">
                  <Shield className="mx-auto mb-3 h-10 w-10 text-ink-200" />
                  <p className="text-sm">{vaults.length === 0 ? 'Create a vault to get started.' : 'Select a vault.'}</p>
                </div>
              </div>
            ) : !vaultKey ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-ink-400">Unlocking…</p>
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
                    {isOwner && (
                      <Button variant="ghost" size="sm" onClick={() => setAuditLogOpen(true)}>
                        <History size={14} />
                        Audit Log
                      </Button>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="sm" onClick={() => setAddMemberOpen(true)}>
                        <UserPlus size={14} />
                        Members
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEditingItem(null);
                        setItemDialogOpen(true);
                      }}
                    >
                      <Plus size={14} />
                      New Item
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {itemsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="py-12 text-center text-sm text-ink-400">No items yet. Add your first secret.</div>
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
                              {ITEM_TYPE_META[item.itemType].icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink-900">{content?.title ?? '…'}</p>
                              <p className="text-xs text-ink-400">
                                {ITEM_TYPE_META[item.itemType].label}
                                {content?.username ? ` · ${content.username}` : ''}
                              </p>
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

      {/* New Vault */}
      <Dialog open={newVaultOpen} onOpenChange={setNewVaultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Vault</DialogTitle>
          </DialogHeader>
          <NewVaultForm
            loading={createVault.isPending}
            error={createVault.error ? getErrorMessage(createVault.error) : null}
            onCancel={() => setNewVaultOpen(false)}
            onSubmit={(name) => createVault.mutate(name)}
          />
        </DialogContent>
      </Dialog>

      {/* Members */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vault Members — {selectedVault?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-sm px-2 py-2 hover:bg-ink-50">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-ink-900">{m.name}</p>
                      <p className="text-xs capitalize text-ink-400">{m.principalType}</p>
                    </div>
                  </div>
                  {members.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-terracotta-600 hover:bg-terracotta-100"
                      onClick={() => removeMember.mutate(m.id)}
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-ink-200 pt-4">
              <Label>Add someone</Label>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {candidates
                  .filter((c) => !existingMemberKeys.has(`${c.type}:${c.id}`))
                  .map((c) => (
                    <div key={`${c.type}:${c.id}`} className="flex items-center justify-between rounded-sm px-2 py-2 hover:bg-ink-50">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div>
                          <p className="text-sm text-ink-900">{c.name}</p>
                          <p className="text-xs capitalize text-ink-400">{c.type}</p>
                        </div>
                      </div>
                      {c.hasVaultAccess ? (
                        <Button variant="secondary" size="sm" disabled={addMember.isPending} onClick={() => addMember.mutate(c)}>
                          Add
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-400">Hasn't set up Vault yet</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New / Edit item */}
      <Dialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'New Item'}</DialogTitle>
          </DialogHeader>
          <VaultItemForm
            editingItem={editingItem}
            initialContent={editingItem ? decryptedItems.get(editingItem.id) ?? null : null}
            loading={saveItem.isPending}
            onCancel={() => setItemDialogOpen(false)}
            onSubmit={(itemType, content) => saveItem.mutate({ itemType, content, id: editingItem?.id })}
          />
        </DialogContent>
      </Dialog>

      {/* Item detail */}
      <Dialog open={!!detailItemId} onOpenChange={(open) => !open && setDetailItemId(null)}>
        <DialogContent>
          {detailItem && detailContent && (
            <>
              <DialogHeader>
                <DialogTitle>{detailContent.title}</DialogTitle>
              </DialogHeader>
              <VaultItemDetail
                content={detailContent}
                onEdit={() => {
                  setEditingItem(detailItem);
                  setDetailItemId(null);
                  setItemDialogOpen(true);
                }}
                onDelete={() => {
                  setDeleteItemId(detailItem.id);
                  setDetailItemId(null);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit log */}
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
                  <span className="text-ink-700">
                    <span className="capitalize font-medium">{entry.principalType}</span> {actionLabel(entry.action)}
                  </span>
                  <span className="text-xs text-ink-400">{format(new Date(entry.createdAt), 'MMM d, h:mm a')}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        title="Delete item"
        description="This will permanently remove this item from the vault. This action cannot be undone."
        loading={deleteItem.isPending}
        onConfirm={() => deleteItemId && deleteItem.mutate(deleteItemId)}
      />
    </div>
  );
}

function actionLabel(action: VaultAuditLogEntry['action']): string {
  switch (action) {
    case 'vault_created':
      return 'created this vault';
    case 'item_created':
      return 'created an item';
    case 'item_updated':
      return 'updated an item';
    case 'item_deleted':
      return 'deleted an item';
    case 'item_accessed':
      return 'viewed an item';
    case 'member_added':
      return 'added a member';
    case 'member_removed':
      return 'removed a member';
    default:
      return action;
  }
}

function NewVaultForm({
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  error: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length >= 2) onSubmit(name.trim());
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="vault-name">Vault name</Label>
        <Input id="vault-name" placeholder="e.g. Hosting Credentials" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <p className="text-xs text-terracotta-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading || name.trim().length < 2}>
          {loading ? 'Creating…' : 'Create Vault'}
        </Button>
      </div>
    </form>
  );
}

