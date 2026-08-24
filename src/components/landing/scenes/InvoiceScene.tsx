import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { SceneStage, Plane, willChangeWhile } from './SceneStage';

const ROWS = [
  { number: 'PT-2212', client: 'Rivelle Studio', date: 'Mar 4, 2026', amount: '$2,400.00', status: 'paid' as const },
  { number: 'PT-2214', client: 'Hallam & Wick', date: 'Mar 11, 2026', amount: '$4,820.00', settles: true },
  { number: 'PT-2215', client: 'Osterlen AB', date: 'Mar 18, 2026', amount: '$1,150.00', status: 'draft' as const },
];

const STATUS = {
  paid: { variant: 'moss', label: 'Paid' },
  sent: { variant: 'pine', label: 'Sent' },
  draft: { variant: 'neutral', label: 'Draft' },
} as const;

/**
 * An invoice settling. The middle row's status cross-fades Sent into Paid by
 * stacking both chips and animating opacity, so no colour is interpolated and
 * no text is rewritten mid-loop.
 */
export function InvoiceScene({ play }: { play: boolean }) {
  // One shared 5.2s cycle: the chip flips just past the midpoint and holds.
  const flip = play
    ? { duration: 5.2, times: [0, 0.45, 0.52, 0.94, 1], repeat: Infinity, ease: EASE_BRAND }
    : { duration: 0.2 };

  return (
    <SceneStage aspectRatio="4 / 3" className="w-full">
      <Plane name="mid" className="flex items-center justify-center" style={willChangeWhile(play)}>
        <div className="w-[92%] overflow-hidden rounded-lg border border-ink-300 bg-bone-50 shadow-lg">
          <div className="border-b border-ink-200 bg-bone-100 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-ink-900">Invoices</p>
          </div>

          <div className="divide-y divide-ink-200">
            {ROWS.map((row) => (
              <div key={row.number} className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <motion.span
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-brass-100 text-brass-700"
                    animate={
                      row.settles && play
                        ? { scale: [1, 1, 1.12, 1, 1] }
                        : { scale: 1 }
                    }
                    transition={flip}
                  >
                    <FileText size={13} />
                  </motion.span>
                  <div>
                    <p className="text-[10px] font-medium leading-tight text-ink-900">
                      {row.number}
                    </p>
                    <p className="text-[9px] leading-tight text-ink-400">
                      {row.client} · {row.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {row.settles ? (
                    <span className="relative inline-flex">
                      {/* Sent, on top until it hands over */}
                      <motion.span
                        animate={play ? { opacity: [1, 1, 0, 0, 1] } : { opacity: 1 }}
                        transition={flip}
                      >
                        <Badge variant="pine" className="!px-2 !py-0 !text-[9px]">
                          Sent
                        </Badge>
                      </motion.span>
                      <motion.span
                        className="absolute inset-0 flex items-center"
                        animate={play ? { opacity: [0, 0, 1, 1, 0] } : { opacity: 0 }}
                        transition={flip}
                      >
                        <Badge variant="moss" className="!px-2 !py-0 !text-[9px]">
                          Paid
                        </Badge>
                      </motion.span>
                    </span>
                  ) : (
                    <Badge
                      variant={STATUS[row.status!].variant}
                      className="!px-2 !py-0 !text-[9px]"
                    >
                      {STATUS[row.status!].label}
                    </Badge>
                  )}
                  <p className="w-14 text-right text-[10px] font-medium tabular-nums text-ink-900">
                    {row.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Plane>
    </SceneStage>
  );
}
