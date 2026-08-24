import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useVaultStore } from '@/store/vault';
import { unwrapVaultKey, encryptJson, decryptJson } from '@/lib/vaultCrypto';
import type { VaultSummary, VaultItemRecord, VaultItemContent, VaultItemType } from '@/lib/types';
import { VaultUnlockGate } from '@/components/vault/VaultUnlockGate';
import { VaultItemForm } from '@/components/vault/VaultItemForm';
import { VaultItemDetail } from '@/components/vault/VaultItemDetail';
import { ITEM_TYPE_META } from '@/components/vault/vaultItemMeta';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Lock, Plus } from 'lucide-react';

export function VaultTab() {
  return (
    <VaultUnlockGate apiBase="/vault">
      <VaultPanelWorkspace />
    </VaultUnlockGate>
  );
}

function VaultPanelWorkspace() {
  const queryClient = useQueryClient();
  const privateKey = useVaultStore((s) => s.privateKey);
  const vaultKeys = useVaultStore((s) => s.vaultKeys);
  const setVaultKeyInStore = useVaultStore((s) => s.setVaultKey);

  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<Map<string, VaultItemContent>>(new Map());
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemRecord | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const { data: vaults = [], isLoading: vaultsLoading } = useQuery({
    queryKey: ['vaults'],
    queryFn: () => api.get<VaultSummary[]>('/vault/vaults').then((res) => res.data),
  });

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) ?? null;
  const vaultKey = selectedVaultId ? vaultKeys.get(selectedVaultId) : undefined;

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['vault-items', selectedVaultId],
    queryFn: () => api.get<VaultItemRecord[]>(`/vault/vaults/${selectedVaultId}/items`).then((res) => res.data),
    enabled: !!selectedVaultId,
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

  const detailItem = detailItemId ? items.find((i) => i.id === detailItemId) ?? null : null;
  const detailContent = detailItemId ? decryptedItems.get(detailItemId) ?? null : null;

  if (vaultsLoading) {
    return <PanelSkeletonList count={4} />;
  }

  if (vaults.length === 0) {
    return <PanelEmptyState icon={<Lock className="h-6 w-6 text-ink-300" />} message="No vaults yet. Create one from the full app." />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-ink-100 px-3 py-2">
        {vaults.length > 1 ? (
          <Select
            id="panel-vault-select"
            className="flex-1"
            value={selectedVaultId ?? ''}
            onChange={(e) => setSelectedVaultId(e.target.value)}
          >
            {vaults.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        ) : (
          <p className="flex-1 truncate text-sm font-medium text-ink-900">{selectedVault?.name}</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          disabled={!vaultKey}
          title="New item"
          onClick={() => {
            setEditingItem(null);
            setItemDialogOpen(true);
          }}
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {!vaultKey ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-ink-400">Unlocking…</p>
          </div>
        ) : itemsLoading ? (
          <PanelSkeletonList count={3} />
        ) : items.length === 0 ? (
          <PanelEmptyState icon={<Lock className="h-6 w-6 text-ink-300" />} message="No items yet." />
        ) : (
          <div className="divide-y divide-ink-100">
            {items.map((item, index) => {
              const content = decryptedItems.get(item.id);
              return (
                <PanelListRow
                  as="button"
                  key={item.id}
                  index={index}
                  onClick={() => setDetailItemId(item.id)}
                  className="w-full items-center text-left"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm bg-ink-100 text-ink-600">
                    {ITEM_TYPE_META[item.itemType].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-900">{content?.title ?? '…'}</p>
                    <p className="truncate text-[11px] text-ink-400">
                      {ITEM_TYPE_META[item.itemType].label}
                      {content?.username ? ` · ${content.username}` : ''}
                    </p>
                  </div>
                </PanelListRow>
              );
            })}
          </div>
        )}
      </div>

      {/* New / Edit item */}
      <Dialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent overlayClassName="backdrop-blur-none bg-ink-950/60">
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
        <DialogContent overlayClassName="backdrop-blur-none bg-ink-950/60">
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

      <ConfirmDeleteDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        title="Delete item"
        description="This will permanently remove this item from the vault. This action cannot be undone."
        loading={deleteItem.isPending}
        onConfirm={() => deleteItemId && deleteItem.mutate(deleteItemId)}
        overlayClassName="backdrop-blur-none bg-ink-950/60"
      />
    </div>
  );
}
