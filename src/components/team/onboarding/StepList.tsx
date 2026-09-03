import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Crosshair, GripVertical, Image, ListChecks, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { StudioStep } from '@/lib/onboarding/types';

export function StepList({
  steps,
  selectedId,
  onSelect,
  onReorder,
  onAdd,
  onDelete,
}: {
  steps: StudioStep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (steps: StudioStep[]) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(
    // A small activation distance so clicking a row to select it is never read as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = steps.findIndex((s) => s.id === active.id);
    const to = steps.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    // The whole array is written back at once — steps live in a jsonb column, so a reorder is
    // one atomic write rather than renumbering an order column across rows.
    onReorder(arrayMove(steps, from, to));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        {steps.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-ink-400">
            No steps yet. Add the first thing a new person should know.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {steps.map((step, index) => (
                  <SortableRow
                    key={step.id}
                    step={step}
                    index={index}
                    selected={step.id === selectedId}
                    onSelect={() => onSelect(step.id)}
                    onDelete={() => onDelete(step.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="border-t border-ink-200 p-3">
        <Button variant="secondary" size="sm" className="w-full" onClick={onAdd}>
          <Plus size={14} />
          Add step
        </Button>
      </div>
    </div>
  );
}

function SortableRow({
  step,
  index,
  selected,
  onSelect,
  onDelete,
}: {
  step: StudioStep;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 rounded-sm border px-2 py-2 transition-all duration-hover ease-brand',
        selected
          ? 'border-brass-500 bg-brass-100/40'
          : 'border-transparent hover:border-ink-200 hover:bg-ink-50',
        isDragging && 'relative z-10 -translate-y-0.5 border-ink-300 bg-bone-50 shadow-sm',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-ink-300 transition-colors duration-hover ease-brand hover:text-ink-500 active:cursor-grabbing"
        aria-label={`Reorder ${step.title || 'step'}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-medium tabular-nums text-ink-400">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="block truncate text-sm font-medium text-ink-900">
          {step.title || 'Untitled step'}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-ink-300">
          {step.anchorId && <Crosshair size={11} aria-label="Points at an element" />}
          {step.mediaDocumentId && <Image size={11} aria-label="Has media" />}
          {step.isTask && <ListChecks size={11} aria-label="Completable task" />}
        </span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="rounded-sm p-1 text-ink-300 opacity-0 transition-all duration-hover ease-brand hover:bg-terracotta-100 hover:text-terracotta-600 focus-ring group-hover:opacity-100"
        aria-label={`Delete ${step.title || 'step'}`}
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}
