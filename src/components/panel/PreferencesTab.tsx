import { useEffect, useState } from 'react';
import { usePanelPrefsStore } from '@/store/panelPrefs';
import { useThemeStore, type ThemePreference } from '@/store/theme';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/utils';
import type { PanelPrefs } from '@/types/electron';

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

const BLUR_OPTIONS: { id: PanelPrefs['blurMode']; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'frosted', label: 'Frosted' },
  { id: 'heavy', label: 'Heavy' },
];

const SIZE_OPTIONS: { id: PanelPrefs['sizePreset']; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'standard', label: 'Standard' },
  { id: 'tall', label: 'Tall' },
];

const IGNORED_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);
const KEY_LABELS: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Esc',
};

function keyEventToAccelerator(e: KeyboardEvent): string | null {
  if (IGNORED_KEYS.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (parts.length === 0) return null; // require at least one modifier — avoids binding a bare letter key
  const mainKey = KEY_LABELS[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  parts.push(mainKey);
  return parts.join('+');
}

function formatAccelerator(accelerator: string): string {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  return accelerator
    .split('+')
    .map((part) => (part === 'CommandOrControl' ? (isMac ? '⌘' : 'Ctrl') : part))
    .join(' + ');
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">{children}</p>;
}

export function PreferencesTab() {
  const prefs = usePanelPrefsStore((s) => s.prefs);
  const setPref = usePanelPrefsStore((s) => s.setPref);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const [recording, setRecording] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    setShortcutError(null);

    const onKeyDown = async (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') {
        setRecording(false);
        return;
      }
      const accelerator = keyEventToAccelerator(e);
      if (!accelerator) return;
      setRecording(false);
      const result = await window.portico?.shortcut.rebind(accelerator);
      if (result && !result.ok) setShortcutError(result.error || 'That shortcut is already in use.');
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording]);

  return (
    <div className="space-y-5 p-3">
      <div>
        <SectionLabel>Theme</SectionLabel>
        <SegmentedControl options={THEME_OPTIONS} value={themePreference} onChange={setThemePreference} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>Opacity</SectionLabel>
          <span className="text-xs text-ink-500">{prefs.opacity}%</span>
        </div>
        <Slider
          min={0}
          max={100}
          step={5}
          value={prefs.opacity}
          onChange={(e) => setPref({ opacity: Number(e.target.value) })}
        />
      </div>

      <div>
        <SectionLabel>Blur</SectionLabel>
        <SegmentedControl options={BLUR_OPTIONS} value={prefs.blurMode} onChange={(blurMode) => setPref({ blurMode })} />
        <p className="mt-1.5 text-[11px] text-ink-400">
          Native blur availability depends on your OS — falls back to a plain tint where unsupported.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <SectionLabel>Corner radius</SectionLabel>
          <span className="text-xs text-ink-500">{prefs.cornerRadius}px</span>
        </div>
        <Slider
          min={8}
          max={24}
          step={1}
          value={prefs.cornerRadius}
          onChange={(e) => setPref({ cornerRadius: Number(e.target.value) })}
        />
        {prefs.blurMode !== 'off' && (
          <p className="mt-1.5 text-[11px] text-ink-400">
            Approximate while blur is active — the OS applies its own fixed radius.
          </p>
        )}
      </div>

      <div>
        <SectionLabel>Size</SectionLabel>
        <SegmentedControl
          options={SIZE_OPTIONS}
          value={prefs.sizePreset === 'custom' ? 'compact' : prefs.sizePreset}
          onChange={(sizePreset) => setPref({ sizePreset })}
        />
        <p className="mt-1.5 text-[11px] text-ink-400">You can also drag an edge to resize freely.</p>
      </div>

      <div className="flex items-center justify-between">
        <SectionLabel>Always on top</SectionLabel>
        <Switch checked={prefs.alwaysOnTop} onCheckedChange={(alwaysOnTop) => setPref({ alwaysOnTop })} />
      </div>

      <div className="flex items-center justify-between">
        <SectionLabel>Mute notifications</SectionLabel>
        <Switch
          checked={prefs.notificationsMuted}
          onCheckedChange={(notificationsMuted) => setPref({ notificationsMuted })}
        />
      </div>

      <div>
        <SectionLabel>Global shortcut</SectionLabel>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRecording(true)}
            className={cn(
              'flex h-8 flex-1 items-center justify-center rounded-sm border text-xs font-medium transition-colors duration-hover ease-brand',
              recording
                ? 'border-brass-400 bg-brass-50 text-brass-700'
                : 'border-ink-300 bg-bone-50 text-ink-700 hover:bg-ink-50'
            )}
          >
            {recording ? 'Press keys…' : formatAccelerator(prefs.shortcut)}
          </button>
        </div>
        {shortcutError && <p className="mt-1.5 text-[11px] text-terracotta-600">{shortcutError}</p>}
      </div>
    </div>
  );
}
