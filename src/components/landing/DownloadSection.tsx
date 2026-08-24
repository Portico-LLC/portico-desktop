import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Download, Maximize2, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/Button';
import { BrandMark } from '@/components/brand/BrandMark';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { springs, motionTransition } from '@/lib/motion/springs';
import { AppleMark, WindowsMark } from '@/components/landing/PlatformMarks';
import {
  ALL_RELEASES_URL,
  DOWNLOADS,
  LATEST_RELEASE_API,
  PLATFORM_ORDER,
  detectPlatform,
  formatBytes,
  type PlatformId,
} from '@/lib/downloads';

const MARKS: Record<PlatformId, typeof WindowsMark> = {
  windows: WindowsMark,
  macos: AppleMark,
};

const HEADLINE = ['Portico, out of', 'the browser.'];

interface ReleaseInfo {
  version: string;
  sizes: Record<string, number>;
}

/**
 * Reads the current release straight from GitHub so the version and file size on
 * the page track the actual latest build without a redeploy.
 *
 * Deliberately has no error state: an unauthenticated GitHub API call is rate
 * limited per IP and will occasionally just fail. When it does the badge stays
 * empty rather than showing the visitor an apology for something that does not
 * affect them — the download links are static and work either way.
 */
function useLatestRelease(): ReleaseInfo | null {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(LATEST_RELEASE_API, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { tag_name?: string; assets?: { name: string; size: number }[] }) => {
        if (!data.tag_name) return;
        const sizes: Record<string, number> = {};
        for (const asset of data.assets ?? []) sizes[asset.name] = asset.size;
        setRelease({ version: data.tag_name.replace(/^v/, ''), sizes });
      })
      .catch(() => {
        /* rate limited, offline, or no release yet — the badge simply stays empty */
      });

    return () => controller.abort();
  }, []);

  return release;
}

/**
 * The two-pill platform switch. The indicator is a single shared element moved
 * between pills with `layoutId`, the same mechanic the app's own panel tabs use
 * — one object sliding, rather than two states cross-fading.
 */
function PlatformSwitch({
  platform,
  onChange,
  reduce,
}: {
  platform: PlatformId;
  onChange: (next: PlatformId) => void;
  reduce: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose your platform"
      className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-bone-100 p-1"
    >
      {PLATFORM_ORDER.map((id) => {
        const Mark = MARKS[id];
        const active = platform === id;

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
              'transition-colors duration-hover ease-brand focus-ring',
              active ? 'text-bone-50' : 'text-ink-600 hover:text-ink-900'
            )}
          >
            {active && (
              <motion.span
                layoutId="platform-switch-indicator"
                className="absolute inset-0 rounded-full bg-pine-900"
                transition={motionTransition(reduce, springs.snappy)}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Mark size={15} />
              {DOWNLOADS[id].label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The Gatekeeper disclosure, macOS only.
 *
 * An unsigned build fails to open with a message that reads like a corrupted
 * download ("Portico is damaged"), so saying nothing here would cost more trust
 * than the admission does.
 */
function MacNotice({ reduce }: { reduce: boolean }) {
  const command = 'xattr -cr /Applications/Portico.app';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6 }}
      transition={motionTransition(reduce, springs.snappy)}
      className="mt-5 max-w-md rounded-sm border border-ink-200 bg-bone-100 p-4"
    >
      <p className="text-xs font-medium text-ink-900">First launch on macOS</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-600">
        This build is not notarized yet. If macOS says the app is damaged, clear the quarantine
        flag once:
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <code className="flex-1 truncate rounded-sm bg-ink-950 px-2.5 py-1.5 font-mono text-[11px] text-bone-100">
          {command}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(command).then(
              () => setCopied(true),
              () => {
                /* clipboard blocked — the command is still selectable above */
              }
            );
          }}
          aria-label={copied ? 'Copied' : 'Copy command'}
          className="focus-ring flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border border-ink-200 text-ink-500 transition-colors duration-hover ease-brand hover:border-ink-300 hover:text-ink-900"
        >
          {copied ? <Check size={13} className="text-moss-600" /> : <Copy size={13} />}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * The window mock.
 *
 * The chrome genuinely differs by platform in the shipped app: macOS gets
 * `titleBarStyle: 'hiddenInset'` and keeps its native traffic lights, while
 * Windows gets `frame: false` and draws its own controls (electron/main.cjs
 * createWindow, and MainTitleBar.tsx). So the switch morphs one window instead
 * of swapping two pictures — `layout` on the brand block is what makes it slide
 * across as the traffic lights appear, exactly as the real title bar's `pl-20`
 * does.
 */
function WindowMock({ platform, reduce }: { platform: PlatformId; reduce: boolean }) {
  const isMac = platform === 'macos';
  const transition = motionTransition(reduce, springs.reposition);

  return (
    <motion.div
      className="overflow-hidden rounded-lg border border-ink-800 bg-ink-950 shadow-lg"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: EASE_BRAND }}
    >
      <div className="flex h-9 items-center justify-between border-b border-ink-900">
        <div className="flex items-center">
          <AnimatePresence initial={false}>
            {isMac && (
              <motion.div
                key="traffic-lights"
                className="flex items-center gap-2 overflow-hidden pl-4"
                initial={reduce ? false : { opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={reduce ? undefined : { opacity: 0, width: 0 }}
                transition={transition}
              >
                {['bg-terracotta-400', 'bg-ochre-400', 'bg-moss-400'].map((tone) => (
                  <span key={tone} className={cn('h-3 w-3 flex-shrink-0 rounded-full', tone)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout={!reduce}
            transition={transition}
            className="flex items-center gap-2 px-3"
          >
            <BrandMark size={14} tone="bone" />
            <span className="font-display text-[13px] font-medium tracking-tight text-bone-50">
              Portico
            </span>
          </motion.div>
        </div>

        <AnimatePresence initial={false}>
          {!isMac && (
            <motion.div
              key="window-controls"
              className="flex items-stretch self-stretch"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={motionTransition(reduce, springs.snappy)}
            >
              {[Minus, Maximize2, X].map((Icon, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="flex w-11 items-center justify-center text-ink-400"
                >
                  <Icon size={13} />
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* An abstracted read of the app: rail, project list, board. Not a
          screenshot — a screenshot would date the moment the UI moves. */}
      <div className="flex h-[300px] sm:h-[340px]">
        <div className="hidden w-40 flex-shrink-0 border-r border-ink-900 p-3 sm:block">
          <div className="h-2 w-16 rounded-full bg-ink-800" />
          <div className="mt-4 space-y-2.5">
            {[true, false, false, false].map((active, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-sm', active ? 'bg-brass-500' : 'bg-ink-800')} />
                <span
                  className={cn('h-2 rounded-full', active ? 'w-20 bg-ink-600' : 'w-14 bg-ink-800')}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 h-px bg-ink-900" />
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-ink-800" />
                <span className="h-2 w-16 rounded-full bg-ink-800" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-28 rounded-full bg-ink-700" />
            <div className="h-5 w-16 rounded-sm bg-pine-900" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {['Backlog', 'In progress', 'Review'].map((column, ci) => (
              <div key={column} className="space-y-2">
                <div className="h-1.5 w-12 rounded-full bg-ink-800" />
                {Array.from({ length: 3 - ci }).map((_, ri) => (
                  <div
                    key={ri}
                    className="space-y-1.5 rounded-sm border border-ink-800 bg-ink-900 p-2"
                  >
                    <div className="h-1.5 w-full rounded-full bg-ink-700" />
                    <div className="h-1.5 w-2/3 rounded-full bg-ink-800" />
                    {ci === 1 && ri === 0 && <div className="h-1.5 w-8 rounded-full bg-brass-700" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DownloadSection() {
  const reduce = !!useReducedMotion();
  const [platform, setPlatform] = useState<PlatformId>('windows');
  const release = useLatestRelease();

  // Set from the visitor's own OS after mount rather than during render, so the
  // markup stays deterministic and a Mac visitor still lands on the Mac build.
  useEffect(() => setPlatform(detectPlatform()), []);

  const active = DOWNLOADS[platform];
  const size = release?.sizes[active.asset];

  return (
    <section id="download" className="bg-bone-50 py-24 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-[minmax(0,42ch)_1fr] lg:items-center lg:gap-16">
        <div>
          <motion.p
            className="font-mono text-xs uppercase tracking-[0.18em] text-brass-700"
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.3, ease: EASE_BRAND }}
          >
            Desktop app
          </motion.p>

          <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-5xl">
            {HEADLINE.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span
                  className="block"
                  initial={reduce ? false : { y: '100%' }}
                  whileInView={{ y: '0%' }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{
                    ...motionTransition(reduce, springs.reposition),
                    delay: i * 0.09,
                  }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h2>

          <motion.p
            className="mt-5 max-w-md text-base leading-relaxed text-ink-600"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.4, ease: EASE_BRAND, delay: 0.18 }}
          >
            The whole workspace in its own window, with a global shortcut that puts your tasks
            and chat on top of whatever you are working in.
          </motion.p>

          <motion.div
            className="mt-8"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.4, ease: EASE_BRAND, delay: 0.28 }}
          >
            <PlatformSwitch platform={platform} onChange={setPlatform} reduce={reduce} />

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <a
                href={active.url}
                className={cn(
                  buttonVariants({ variant: 'primary', size: 'lg' }),
                  'group transition-transform duration-hover ease-brand hover:-translate-y-0.5'
                )}
              >
                <Download
                  size={16}
                  className="transition-transform duration-hover ease-brand group-hover:translate-y-0.5"
                />
                Download for {active.label}
              </a>

              {/* Reserved height so the row does not reflow when the badge arrives. */}
              <span className="min-h-5 text-sm text-ink-500">
                {release && (
                  <motion.span
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: EASE_BRAND }}
                  >
                    Version {release.version}
                    {size ? ` · ${formatBytes(size)}` : ''}
                  </motion.span>
                )}
              </span>
            </div>

            <p className="mt-3 text-sm text-ink-500">{active.meta}</p>

            <AnimatePresence initial={false} mode="wait">
              {platform === 'macos' && <MacNotice key="mac-notice" reduce={reduce} />}
            </AnimatePresence>

            <p className="mt-6 text-sm text-ink-500">
              <a
                href={ALL_RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="border-b border-ink-300 pb-0.5 transition-colors duration-hover ease-brand hover:border-brass-600 hover:text-ink-900"
              >
                All releases and changelogs
              </a>
            </p>
          </motion.div>
        </div>

        <div className="lg:pl-4">
          <WindowMock platform={platform} reduce={reduce} />

          <motion.p
            className="mt-5 max-w-md text-sm leading-relaxed text-ink-500"
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.4, ease: EASE_BRAND, delay: 0.2 }}
          >
            {platform === 'macos'
              ? 'On macOS, Portico keeps the native traffic lights and insets its title bar around them.'
              : 'On Windows, Portico drops the system frame and draws its own title bar to match the app.'}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
