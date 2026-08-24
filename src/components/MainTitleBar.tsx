import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Minus, Maximize2, Minimize2, X } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { cn } from '@/lib/utils';

// Same -webkit-app-region trick the floating panel's header uses (see
// PanelHeader.tsx) — the whole bar is draggable by default, with every
// interactive region opted back out so clicks/hovers still work.
const dragStyle = { WebkitAppRegion: 'drag' } as unknown as CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties;

function useIsMaximized(): boolean {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.portico?.window.isMaximized().then(setIsMaximized);
    return window.portico?.window.onMaximizedChange(setIsMaximized);
  }, []);

  return isMaximized;
}

const controlButtonClass =
  'flex h-9 w-11 items-center justify-center text-[var(--chrome-text-faint)] transition-colors duration-hover ease-brand hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)]';

export function MainTitleBar() {
  const isMaximized = useIsMaximized();
  const isMac = window.portico?.platform === 'darwin';

  return (
    <div
      className={cn('flex h-9 flex-shrink-0 items-center justify-between bg-[var(--chrome-bg)]', isMac && 'pl-20')}
      style={dragStyle}
      onDoubleClick={() => !isMac && window.portico?.window.maximizeToggle()}
    >
      <div className="flex items-center gap-2 px-3" style={noDragStyle}>
        <BrandMark size={16} tone="bone" />
        <span className="font-display text-[13px] font-medium tracking-tight text-[var(--chrome-text)]">Portico</span>
      </div>

      {!isMac && (
        <div className="flex items-stretch" style={noDragStyle}>
          <button
            type="button"
            title="Minimize"
            aria-label="Minimize"
            onClick={() => window.portico?.window.minimize()}
            className={controlButtonClass}
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            onClick={() => window.portico?.window.maximizeToggle()}
            className={controlButtonClass}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            onClick={() => window.portico?.window.close()}
            className={cn(controlButtonClass, 'hover:bg-[var(--chrome-danger)] hover:text-[var(--chrome-text)]')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
