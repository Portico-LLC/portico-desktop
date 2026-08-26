import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, KeyRound, Download, AlertCircle, Lock } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import type { VaultIdentityRecord } from '@/lib/types';
import { setupVaultIdentity, unlockWithPassphrase, unlockWithRecoveryKey } from '@/lib/vaultCrypto';
import { useVaultStore } from '@/store/vault';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';

interface VaultUnlockGateProps {
  /** '/vault' for owner/employee, '/client/vault' for the client portal. */
  apiBase: string;
  children: React.ReactNode;
}

export function VaultUnlockGate({ apiBase, children }: VaultUnlockGateProps) {
  const isUnlocked = useVaultStore((s) => s.isUnlocked);

  const { data: identity, isLoading, error } = useQuery({
    queryKey: ['vault-identity', apiBase],
    queryFn: () => api.get<VaultIdentityRecord>(`${apiBase}/identity`).then((res) => res.data),
    retry: false,
  });

  if (isLoading) return null;
  if (isUnlocked) return <>{children}</>;

  const needsSetup = (error as any)?.response?.status === 404;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-8">
      {needsSetup ? (
        <SetupFlow apiBase={apiBase} />
      ) : identity ? (
        <UnlockFlow apiBase={apiBase} identity={identity} />
      ) : null}
    </div>
  );
}

function SetupFlow({ apiBase }: { apiBase: string }) {
  const queryClient = useQueryClient();
  const unlock = useVaultStore((s) => s.unlock);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [privateKeyRef, setPrivateKeyRef] = useState<CryptoKey | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const result = await setupVaultIdentity(passphrase);
      await api.post(`${apiBase}/identity`, result.setup);
      return result;
    },
    onSuccess: (result) => {
      setRecoveryKey(result.recoveryKey);
      setPrivateKeyRef(result.privateKey);
    },
    onError: (err) => setError(getErrorMessage(err)),
    meta: { successMessage: 'Vault set up', suppressErrorToast: true },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 10) {
      setError('Use at least 10 characters — this protects everything in your vault.');
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrases do not match.');
      return;
    }
    setupMutation.mutate();
  };

  const downloadRecoveryKit = () => {
    if (!recoveryKey) return;
    const contents = [
      'Portico Vault Recovery Key',
      '===========================',
      '',
      recoveryKey,
      '',
      'Keep this somewhere safe and private (a password manager, a safe, printed and',
      'locked away). Anyone with this code and access to your account can recover',
      'your vault if you forget your passphrase.',
      '',
      'This is the ONLY backup. Portico cannot recover your vault without it — not',
      'even the studio owner or Portico support can decrypt your vault contents.',
    ].join('\n');
    const blob = new Blob([contents], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portico-vault-recovery-key.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (recoveryKey && privateKeyRef) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-moss-600" />
            Save your recovery key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-600">
            This is the <strong>only</strong> way to recover your vault if you forget your passphrase. It will
            never be shown again, and Portico cannot retrieve it for you.
          </p>
          <div className="rounded-md border border-ink-200 bg-ink-50 p-3 text-center font-mono text-sm tracking-wide text-ink-900">
            {recoveryKey}
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={downloadRecoveryKit}>
            <Download size={16} />
            Download recovery kit
          </Button>
          <label className="flex cursor-pointer select-none items-start gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={savedConfirmed}
              onChange={(e) => setSavedConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
            />
            I've saved my recovery key somewhere safe.
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={!savedConfirmed}
            onClick={() => {
              unlock(privateKeyRef);
              queryClient.invalidateQueries({ queryKey: ['vault-identity'] });
            }}
          >
            Continue to Vault
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock size={18} />
          Set up your Vault
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-ink-500">
          Choose a passphrase for your Vault. It's separate from your login password — nobody at your studio,
          including the owner, can reset it for you, and Portico never sees it.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-passphrase">Vault passphrase</Label>
            <Input
              id="vault-passphrase"
              type="password"
              autoComplete="new-password"
              placeholder="At least 10 characters"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vault-passphrase-confirm">Confirm passphrase</Label>
            <Input
              id="vault-passphrase-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" variant="primary" className="w-full" disabled={setupMutation.isPending}>
            {setupMutation.isPending ? 'Setting up…' : 'Create Vault identity'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function UnlockFlow({ apiBase, identity }: { apiBase: string; identity: VaultIdentityRecord }) {
  void apiBase;
  const unlock = useVaultStore((s) => s.unlock);
  const [passphrase, setPassphrase] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const privateKey = useRecovery
        ? await unlockWithRecoveryKey(identity, recoveryKey.trim())
        : await unlockWithPassphrase(identity, passphrase);
      unlock(privateKey);
    } catch {
      setError(useRecovery ? 'That recovery key is incorrect.' : 'That passphrase is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound size={18} />
          Unlock your Vault
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUnlock} className="space-y-4">
          {useRecovery ? (
            <div className="space-y-2">
              <Label htmlFor="vault-recovery">Recovery key</Label>
              <input
                id="vault-recovery"
                className="flex h-10 w-full rounded-sm border border-ink-300 bg-bone-50 px-3 font-mono text-sm placeholder:text-ink-400 focus:border-brass-500 focus:outline-none"
                placeholder="XXXX-XXXX-XXXX-…"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="vault-unlock-passphrase">Vault passphrase</Label>
              <Input
                id="vault-unlock-passphrase"
                type="password"
                autoComplete="current-password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Unlocking…' : 'Unlock'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setUseRecovery((v) => !v);
              setError(null);
            }}
            className="w-full text-center text-xs font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
          >
            {useRecovery ? 'Use my passphrase instead' : "Forgot your passphrase? Use your recovery key"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
