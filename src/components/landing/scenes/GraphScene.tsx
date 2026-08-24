import { motion } from 'framer-motion';
import { Briefcase, CheckSquare, Users, FileText, MessageSquare } from 'lucide-react';
import { EASE_BRAND, pathTransition } from '@/components/brand/ArchMotif';

/** Percent coordinates so the graph scales with its container. */
// Weighted toward the upper half: on the Brain section the copy card overlaps
// the bottom of this panel, and the hub in particular must stay clear of it.
const NODES = [
  { x: 50, y: 34, label: 'Hallam & Wick', kind: 'Project', icon: Briefcase, tint: 'bg-pine-100 text-pine-700', border: 'border-pine-400/40', hub: true },
  { x: 14, y: 13, label: 'Wren Okafor', kind: 'Client', icon: Users, tint: 'bg-steel-100 text-steel-600', border: 'border-steel-400/40' },
  { x: 85, y: 11, label: 'Hero, final pass', kind: 'Task', icon: CheckSquare, tint: 'bg-brass-100 text-brass-700', border: 'border-brass-400/40' },
  { x: 87, y: 57, label: 'PT-2214', kind: 'Invoice', icon: FileText, tint: 'bg-ochre-100 text-ochre-600', border: 'border-ochre-400/40' },
  { x: 13, y: 59, label: 'Kickoff notes', kind: 'Thread', icon: MessageSquare, tint: 'bg-moss-100 text-moss-700', border: 'border-moss-400/40' },
];

const EDGES = [1, 2, 3, 4].map((to) => ({ from: 0, to }));

/**
 * The knowledge graph assembling itself: edges draw, then each node pops in as
 * its edge lands. It depicts the thing the section is describing, which is the
 * only reason this much motion earns its place here.
 */
export function GraphScene({ play }: { play: boolean }) {
  return (
    <div aria-hidden className="relative aspect-[4/3] w-full">
      {/* Edges, drawn beneath the nodes */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {EDGES.map((edge, i) => {
          const a = NODES[edge.from];
          const b = NODES[edge.to];
          return (
            <motion.line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#C6C0B0"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={pathTransition(0.1 + i * 0.12)}
            />
          );
        })}
      </svg>

      {/* A query travelling out from the hub, the one looping beat */}
      {EDGES.map((edge, i) => {
        const a = NODES[edge.from];
        const b = NODES[edge.to];
        return (
          <motion.span
            key={`pulse-${i}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-brass-500"
            style={{ left: `${a.x}%`, top: `${a.y}%`, marginLeft: -3, marginTop: -3 }}
            initial={{ opacity: 0 }}
            animate={
              play
                ? {
                    x: [0, 0, `${b.x - a.x}%`, `${b.x - a.x}%`],
                    y: [0, 0, `${b.y - a.y}%`, `${b.y - a.y}%`],
                    opacity: [0, 1, 1, 0],
                  }
                : { opacity: 0 }
            }
            transition={
              play
                ? {
                    duration: 8,
                    times: [0, 0.1 + i * 0.04, 0.42 + i * 0.04, 0.5 + i * 0.04],
                    repeat: Infinity,
                    ease: EASE_BRAND,
                  }
                : { duration: 0.2 }
            }
          />
        );
      })}

      {/* Nodes */}
      {NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, ease: EASE_BRAND, delay: i === 0 ? 0 : 0.55 + i * 0.12 }}
        >
          <div
            className={`flex items-center gap-1.5 rounded-md border bg-bone-50 px-2 py-1.5 shadow-xs ${node.border} ${
              node.hub ? 'ring-1 ring-brass-400' : ''
            }`}
          >
            <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-sm ${node.tint}`}>
              <node.icon size={10} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium leading-tight text-ink-900">
                {node.label}
              </p>
              <p className="text-[8px] leading-tight text-ink-400">{node.kind}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
