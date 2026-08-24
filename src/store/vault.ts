import { create } from 'zustand';

/**
 * Deliberately NOT persisted to localStorage/sessionStorage — the unlocked
 * private key and any unwrapped vault keys live only in memory for the
 * current tab session, and vanish on refresh, tab close, or logout. This is
 * the "session unlock" model (same idea as 1Password's unlock step), and it's
 * what makes the zero-knowledge property real: nothing decryptable ever
 * touches disk.
 */
interface VaultState {
  privateKey: CryptoKey | null;
  vaultKeys: Map<string, CryptoKey>;
  isUnlocked: boolean;
  unlock: (privateKey: CryptoKey) => void;
  lock: () => void;
  setVaultKey: (vaultId: string, key: CryptoKey) => void;
  getVaultKey: (vaultId: string) => CryptoKey | undefined;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  privateKey: null,
  vaultKeys: new Map(),
  isUnlocked: false,

  unlock: (privateKey) => set({ privateKey, isUnlocked: true }),

  lock: () => set({ privateKey: null, vaultKeys: new Map(), isUnlocked: false }),

  setVaultKey: (vaultId, key) => {
    const next = new Map(get().vaultKeys);
    next.set(vaultId, key);
    set({ vaultKeys: next });
  },

  getVaultKey: (vaultId) => get().vaultKeys.get(vaultId),
}));
