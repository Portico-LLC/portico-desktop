import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Task, TaskStatus } from '@/lib/types';
import { STATUS_META, TASK_STATUSES } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { CheckSquare, Calendar, Trash2, Ban, Pencil } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

// A critically-damped-looking settle for the dropped card — dnd-kit only takes
// a CSS easing string (not real spring physics), so this is the closest visual
// analog: a soft, decelerating landing rather than the library's linear default.
const dropAnimationConfig: DropAnimation = {
  duration: 250,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
};

// Titles come from the shared STATUS_META so the board, the Tasks page and the
// desktop panel can't drift on what a status is called; the descriptions are
// board-only copy and stay here.
const COLUMN_DESCRIPTIONS: Record<TaskStatus, string> = {
  todo: 'Tasks ready to be picked up',
  'in-progress': 'Tasks currently being worked',
  review: 'Tasks awaiting review',
  done: 'Completed tasks',
};

const STATUS_COLUMNS: { id: string; title: string; description?: string }[] = TASK_STATUSES.map(
  (id) => ({ id, title: STATUS_META[id].label, description: COLUMN_DESCRIPTIONS[id] })
);

function KanbanCard({
  task,
  onClick,
  onEdit,
  onDelete,
  isDragging,
}: {
  task: Task;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
}) {
  const priorityColors = {
    low: 'neutral',
    medium: 'pine',
    high: 'ochre',
    urgent: 'terracotta',
  } as const;

  const due = task.dueDate ? new Date(task.dueDate) : null;
  const dueText = due
    ? isToday(due)
      ? format(due, 'hh:mm a')
      : isTomorrow(due)
        ? 'Tomorrow'
        : format(due, 'MMM d')
    : '';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group mb-3 cursor-grab rounded-sm border border-ink-200 bg-bone-50 p-3 shadow-xs transition-all duration-hover ease-brand hover:translate-y-[-1px] hover:shadow-sm active:cursor-grabbing',
        isDragging && 'scale-[1.03] shadow-md',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-ink-300" />
          <span className="text-sm font-medium text-ink-900">{task.title}</span>
        </div>
        <Badge variant={priorityColors[task.priority]} dot>
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs text-ink-500">{task.description}</p>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-ink-200 pt-2">
        <div className="flex items-center gap-1.5 text-xs text-ink-400">
          {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
          {task.dueDate && (
            <>
              <Calendar size={12} className="text-ink-300" />
              <span>{dueText || 'Set due date'}</span>
            </>
          )}
          {task.dueDate && new Date(task.dueDate) < new Date() ? (
            <span className="text-terracotta-600 font-medium">Overdue</span>
          ) : null}
          {task.blockedBy && task.blockedBy.length > 0 && (
            <span
              className="inline-flex items-center gap-1 font-medium text-terracotta-600"
              title={`Blocked by: ${task.blockedBy.map((b) => b.title).join(', ')}`}
            >
              <Ban size={12} />
              Blocked
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Edit task"
              className="text-ink-300 hover:text-ink-600 transition-colors duration-hover ease-brand"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Delete task"
              className="text-ink-300 hover:text-terracotta-600 transition-colors duration-hover ease-brand"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableCard({
  task,
  onClick,
  onEdit,
  onDelete,
}: {
  task: Task;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <KanbanCard task={task} onClick={onClick} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  description,
  count,
  children,
  isOver,
}: {
  id: string;
  title: string;
  description?: string;
  count: number;
  children: ReactNode;
  isOver?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="min-w-[280px] flex-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-ink-900">{title}</h3>
        <Badge variant="neutral" className="h-5 px-2">
          {count}
        </Badge>
      </div>
      {description && <p className="mb-3 text-xs text-ink-400">{description}</p>}
      <div
        ref={setNodeRef}
        className={`min-h-[300px] rounded-sm border-2 border-dashed p-1 transition-colors duration-hover ease-brand ${
          isOver ? 'border-brass-500 bg-brass-100/30' : 'border-ink-200 bg-transparent'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (updates: Partial<Task> & { id: string }) => void;
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function KanbanBoard({ tasks, onTaskUpdate, onTaskClick, onTaskEdit, onTaskDelete }: KanbanBoardProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const didDrag = useRef(false);

  useEffect(() => {
    setLocalTasks((prev) => {
      if (
        prev.length === tasks.length &&
        prev.every((t, i) => {
          const next = tasks[i];
          return (
            t.id === next?.id &&
            t.status === next?.status &&
            t.order === next?.order &&
            t.title === next?.title
          );
        })
      ) {
        return prev;
      }
      return tasks;
    });
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const activeTask = activeId ? localTasks.find((t) => t.id === activeId) ?? null : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const colId = STATUS_COLUMNS.find((c) => c.id === over.id)?.id;
    if (colId) {
      setOverColumnId(colId);
      return;
    }

    const overTask = localTasks.find((t) => t.id === over.id);
    if (overTask) {
      setOverColumnId(overTask.status);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setOverColumnId(null);
    didDrag.current = true;
    if (!over) return;

    const task = localTasks.find((t) => t.id === active.id);
    if (!task) return;

    const overColumn = STATUS_COLUMNS.find((c) => c.id === over.id);

    if (overColumn) {
      if (task.status === overColumn.id) return;
      const toIndex = localTasks.filter(
        (t) => t.id !== task.id && t.status === overColumn.id
      ).length;
      const updated = [...localTasks.map((t) => (t.id === task.id ? { ...task, status: overColumn.id as Task['status'], order: toIndex } : t))];
      setLocalTasks(updated);
      onTaskUpdate({ id: task.id, status: overColumn.id as Task['status'], order: toIndex });
      return;
    }

    const overTask = localTasks.find((t) => t.id === over.id);
    if (!overTask) return;

    if (task.status === overTask.status) {
      const columnTasks = localTasks.filter((t) => t.status === task.status);
      const oldIndex = columnTasks.findIndex((t) => t.id === task.id);
      const newIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      const updated = localTasks.map((t) => {
        if (t.status !== task.status) return t;
        const idx = reordered.findIndex((r) => r.id === t.id);
        return { ...t, order: idx };
      });
      setLocalTasks(updated);
      onTaskUpdate({ id: task.id, order: newIndex });
    } else {
      const toIndex = localTasks.filter(
        (t) => t.status === overTask.status && t.id !== task.id
      ).findIndex((t) => t.id === overTask.id);
      const finalIndex = toIndex === -1 ? 0 : toIndex;
      const updated = [...localTasks.map((t) => (t.id === task.id ? { ...task, status: overTask.status as Task['status'], order: finalIndex } : t))];
      setLocalTasks(updated);
      onTaskUpdate({ id: task.id, status: overTask.status as Task['status'], order: finalIndex });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-2">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = localTasks
            .filter((t) => t.status === column.id)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              description={column.description}
              count={columnTasks.length}
              isOver={overColumnId === column.id}
            >
              <SortableContext
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {columnTasks.map((task) => (
                  <SortableCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      if (!didDrag.current) onTaskClick?.(task);
                    }}
                    onEdit={onTaskEdit ? () => onTaskEdit(task) : undefined}
                    onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeTask ? (
          <div className="rotate-2 opacity-90">
            <KanbanCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
