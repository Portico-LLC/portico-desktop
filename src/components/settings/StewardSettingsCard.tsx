import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api, getErrorMessage } from '@/lib/api';
import { STEWARD_EVENT_TRIGGERS, STEWARD_TRIGGER_LABELS } from '@/lib/stewardLabels';
import type { StewardSettings, StewardApiKeyStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function StewardSettingsCard() {
  const role = useAuthStore((s) => s.role);
  const isOwner = role === 'user';
  const queryClient = useQueryClient();
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['steward-settings'],
    queryFn: () => api.get<StewardSettings>('/steward/settings').then((r) => r.data),
    enabled: isOwner,
  });

  const { data: apiKeyStatus } = useQuery({
    queryKey: ['steward-api-key'],
    queryFn: () => api.get<StewardApiKeyStatus>('/steward/api-key').then((r) => r.data),
    enabled: isOwner,
  });

  const updateSettings = useMutation({
    mutationFn: (patch: Partial<StewardSettings>) => api.patch<StewardSettings>('/steward/settings', patch).then((r) => r.data),
    onSuccess: (data) => queryClient.setQueryData(['steward-settings'], data),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const regenerateKey = useMutation({
    mutationFn: () => api.post<{ key: string }>('/steward/api-key/regenerate').then((r) => r.data.key),
    onSuccess: (key) => {
      setRevealedKey(key);
      queryClient.invalidateQueries({ queryKey: ['steward-api-key'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const revokeKey = useMutation({
    mutationFn: () => api.post('/steward/api-key/revoke'),
    onSuccess: () => {
      setRevealedKey(null);
      queryClient.invalidateQueries({ queryKey: ['steward-api-key'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (!isOwner) return null;

  const toggleTrigger = (eventName: string, enabled: boolean) => {
    if (!settings) return;
    updateSettings.mutate({ triggersEnabled: { ...settings.triggersEnabled, [eventName]: enabled } });
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Steward</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <p className="mb-3 text-sm font-medium text-ink-900">Triggers</p>
          <div className="space-y-3">
            {STEWARD_EVENT_TRIGGERS.map((eventName) => (
              <div key={eventName} className="flex items-center justify-between">
                <span className="text-sm text-ink-600">{STEWARD_TRIGGER_LABELS[eventName]}</span>
                <Switch
                  checked={settings ? settings.triggersEnabled[eventName] !== false : true}
                  onCheckedChange={(checked) => toggleTrigger(eventName, checked)}
                  disabled={!settings}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ink-100 pt-5">
          <div>
            <p className="text-sm font-medium text-ink-900">Daily brief</p>
            <p className="text-xs text-ink-400">A single grounded summary of what needs attention, once a day (UTC).</p>
          </div>
          <div className="flex items-center gap-3">
            {settings?.dailyBriefEnabled && (
              <select
                value={settings.dailyBriefHour}
                onChange={(e) => updateSettings.mutate({ dailyBriefHour: Number(e.target.value) })}
                className="h-9 rounded-sm border border-ink-300 bg-bone-50 px-2 text-sm text-ink-900"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00 UTC
                  </option>
                ))}
              </select>
            )}
            <Switch
              checked={settings?.dailyBriefEnabled ?? true}
              onCheckedChange={(checked) => updateSettings.mutate({ dailyBriefEnabled: checked })}
              disabled={!settings}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ink-100 pt-5">
          <div>
            <p className="text-sm font-medium text-ink-900">Proposal retention</p>
            <p className="text-xs text-ink-400">Auto-expire un-actioned proposals after this many days.</p>
          </div>
          <Input
            type="number"
            min={1}
            className="w-20"
            value={settings?.proposalRetentionDays ?? 30}
            onChange={(e) => updateSettings.mutate({ proposalRetentionDays: Number(e.target.value) })}
            disabled={!settings}
          />
        </div>

        <div className="border-t border-ink-100 pt-5">
          <p className="mb-1 text-sm font-medium text-ink-900">MCP API key</p>
          <p className="mb-3 text-xs text-ink-400">
            Connect any MCP-compatible client (Claude Desktop, Claude Code, etc.) directly to your studio's data. Treat this
            key like a password — it has full read/write access to everything Brain can do.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <KeyRound size={14} className="text-ink-400" />
              {apiKeyStatus?.configured ? (
                <span>
                  <span className="font-mono text-xs">{apiKeyStatus.keyPrefix}…</span>
                  {apiKeyStatus.lastUsedAt ? ` · last used ${new Date(apiKeyStatus.lastUsedAt).toLocaleDateString()}` : ' · never used'}
                </span>
              ) : (
                <span className="text-ink-400">Not configured</span>
              )}
            </div>
            <div className="flex gap-2">
              {apiKeyStatus?.configured && (
                <Button size="sm" variant="secondary" onClick={() => revokeKey.mutate()} disabled={revokeKey.isPending}>
                  Revoke
                </Button>
              )}
              <Button size="sm" onClick={() => regenerateKey.mutate()} disabled={regenerateKey.isPending}>
                {apiKeyStatus?.configured ? 'Regenerate' : 'Generate key'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={revealedKey != null} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new MCP API key</DialogTitle>
            <DialogDescription>Copy it now — you won't be able to see it again after closing this dialog.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-sm border border-ink-200 bg-ink-950 px-3 py-2 text-xs text-bone-100">
              {revealedKey}
            </code>
            <Button size="sm" variant="secondary" onClick={copyKey}>
              {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
