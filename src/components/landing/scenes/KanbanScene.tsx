import { motion } from 'framer-motion';
import { CheckSquare, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { SceneStage, Plane, willChangeWhile } from './SceneStage';

const COLUMNS = [
  { name: 'To do', count: 4 },
  { name: 'In progress', count: 2 },
  { name: 'Review', count: 3 },
  { name: 'Done', count: 9 },
];

const RESTING = [
  { col: 0, title: 'Rework the pricing table', priority: 'medium' as const },
  { col: 2, title: 'Client review, round two', priority: 'medium' as const },
  { col: 3, title: 'Export final logo kit', priority: 'low' as const },
];

const PRIORITY_VARIANT = { low: 'neutral', medium: 'pine', high: 'ochre', urgent: 'terracotta' } as const;

function MiniCard({
  title,
  priority,
  assignee,
  due,
}: {
  title: string;
  priority: keyof typeof PRIORITY_VARIANT;
  assignee?: string;
  due?: string;
}) {
  return (
    <div className="rounded-sm border border-ink-200 bg-bone-50 p-2 shadow-xs">
      <div className="flex items-start gap-1.5">
        <CheckSquare size={10} className="mt-0.5 flex-shrink-0 text-ink-300" />
        <p className="text-[10px] font-medium leading-tight text-ink-900">{title}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <Badge variant={PRIORITY_VARIANT[priority]} dot className="!px-1.5 !py-0 !text-[8px]">
          {priority}
        </Badge>
        {assignee && <Avatar name={assignee} size="sm" className="!h-4 !w-4 !text-[7px]" />}
      </div>
      {due && (
        <div className="mt-1.5 flex items-center gap-1 border-t border-ink-200 pt-1.5 text-[8px] text-ink-400">
          <Calendar size={8} />
          {due}
        </div>
      )}
    </div>
  );
}

/**
 * Work crossing the board. One card is picked up, carried a column at a time,
 * and set down again, then leaves at Done and re-enters at To do.
 *
 * The traveller is a full grid cell wide, so `x` in percent maps exactly to one
 * column with no pixel arithmetic and stays correct at any width.
 */
export function KanbanScene({ play }: { play: boolean }) {
  return (
    <SceneStage className="aspect-[3/4] w-full sm:aspect-[4/3]">
      <Plane name="mid" className="px-3 py-4" style={willChangeWhile(play)}>
        <div className="relative h-full">
          {/* Static board */}
          <div className="grid h-full grid-cols-4">
            {COLUMNS.map((column, ci) => (
              <div key={column.name} className="px-1">
                <div className="mb-2 flex items-center gap-1.5">
                  <p className="text-[9px] font-medium text-ink-900">{column.name}</p>
                  <span className="rounded-full bg-ink-100 px-1 text-[8px] font-medium text-ink-500">
                    {column.count}
                  </span>
                </div>
                <div className="h-[calc(100%-1.5rem)] space-y-1.5 rounded-sm border border-dashed border-ink-200 p-1.5">
                  {RESTING.filter((card) => card.col === ci).map((card) => (
                    <MiniCard key={card.title} title={card.title} priority={card.priority} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* The traveller, on its own overlay grid so it can cross columns */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-4">
            <motion.div
              className="px-1 pt-[1.625rem]"
              style={{ transformStyle: 'preserve-3d' }}
              animate={
                play
                  ? {
                      x: ['0%', '0%', '0%', '100%', '100%', '200%', '200%', '300%', '300%', '300%'],
                      opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                      scale: [0.96, 1, 1, 1.04, 1, 1.04, 1, 1.04, 1, 1],
                      rotate: [0, 0, 0, 1.5, 0, 1.5, 0, 1.5, 0, 0],
                    }
                  : { opacity: 0 }
              }
              transition={
                play
                  ? {
                      duration: 9,
                      times: [0, 0.05, 0.18, 0.28, 0.42, 0.52, 0.66, 0.76, 0.94, 1],
                      repeat: Infinity,
                      ease: EASE_BRAND,
                    }
                  : { duration: 0.2 }
              }
            >
              <div className="px-1.5">
                <MiniCard
                  title="Homepage hero, final pass"
                  priority="high"
                  assignee="Noor Haddad"
                  due="Thu"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </Plane>
    </SceneStage>
  );
}
