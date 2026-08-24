import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { isElectron } from '@/lib/isElectron';
import { useRecordingEngine } from '@/lib/recorder/useRecordingEngine';
import { RecordingSetupModal } from './RecordingSetupModal';
import { PermissionPrimerDialog } from './PermissionPrimerDialog';
import { RecordingHud } from './RecordingHud';
import { RecordingPreviewModal } from './RecordingPreviewModal';
import type { Project } from '@/lib/types';
import type { StartRecordingOptions } from '@/lib/recorder/types';

type Step = 'closed' | 'setup' | 'primer' | 'recording' | 'preview';

interface RecorderControllerProps {
  projects?: Project[];
  defaultProjectId?: string;
  renderTrigger: (open: () => void) => ReactNode;
  // The desktop app's mini panel is the dedicated recording surface with a real
  // content-protected HUD (see electron/main.cjs) — the main window redirects
  // there instead of running its own in-page flow. The panel's own Record tab
  // passes false (it *is* that surface, so there's nowhere left to redirect to).
  deepLinkToPanelOnElectron?: boolean;
  // Passed down to every dialog so the panel window (which already applies its
  // own translucent backdrop-blur, see PanelFrame) doesn't double up on blur —
  // matches the overlayClassName pattern already used by VaultTab's dialogs.
  dialogOverlayClassName?: string;
}

// Orchestrates the full record flow (setup -> permission primer -> live HUD ->
// save/discard preview) around a single useRecordingEngine instance. Shared by
// the Documents page toolbar and the desktop app's mini-panel Record tab.
export function RecorderController({
  projects,
  defaultProjectId,
  renderTrigger,
  deepLinkToPanelOnElectron = false,
  dialogOverlayClassName,
}: RecorderControllerProps) {
  const engine = useRecordingEngine();
  const [step, setStep] = useState<Step>('closed');
  const [pendingOptions, setPendingOptions] = useState<StartRecordingOptions | null>(null);

  useEffect(() => {
    if (step === 'primer' && engine.state === 'recording') setStep('recording');
    if (step === 'primer' && engine.state === 'error') setStep('setup');
    if (step === 'recording' && engine.state === 'stopped') setStep('preview');
  }, [engine.state, step]);

  // The engine only actually runs inside the panel window on desktop (the main
  // window redirects there — see `open` below), so this is safe to call
  // unconditionally: it's a no-op everywhere else.
  useEffect(() => {
    if (!isElectron) return;
    const capturing = engine.state === 'recording' || engine.state === 'paused';
    window.portico?.recorder.setContentProtection(capturing);
    return () => window.portico?.recorder.setContentProtection(false);
  }, [engine.state]);

  const close = () => {
    setStep('closed');
    setPendingOptions(null);
    engine.reset();
  };

  const open = () => {
    if (deepLinkToPanelOnElectron && isElectron) {
      window.portico?.panel.showTab('record');
      return;
    }
    setStep('setup');
  };

  return (
    <>
      {renderTrigger(open)}

      <RecordingSetupModal
        open={step === 'setup'}
        error={engine.state === 'error' ? engine.error : null}
        overlayClassName={dialogOverlayClassName}
        onClose={close}
        onContinue={(opts) => {
          setPendingOptions(opts);
          setStep('primer');
        }}
      />

      {pendingOptions && (
        <PermissionPrimerDialog
          open={step === 'primer'}
          mode={pendingOptions.mode}
          micEnabled={pendingOptions.micEnabled}
          overlayClassName={dialogOverlayClassName}
          onCancel={() => setStep('setup')}
          onConfirm={() => engine.start(pendingOptions)}
        />
      )}

      {step === 'recording' && pendingOptions && (
        <RecordingHud
          engine={engine}
          mode={pendingOptions.mode}
          micEnabled={pendingOptions.micEnabled}
          initialCameraShape={pendingOptions.cameraShape}
          initialCameraPosition={pendingOptions.cameraPosition}
        />
      )}

      <RecordingPreviewModal
        open={step === 'preview'}
        result={engine.result}
        projects={projects}
        defaultProjectId={defaultProjectId}
        overlayClassName={dialogOverlayClassName}
        onDiscard={close}
        onSaved={close}
      />
    </>
  );
}
