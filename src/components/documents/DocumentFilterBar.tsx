import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Filter, X } from 'lucide-react';
import type { Project } from '@/lib/types';

export interface DocumentFilterState {
  projectId: string;
  tag: string;
  type: string;
}

interface DocumentFilterBarProps {
  filters: DocumentFilterState;
  onChange: (filters: DocumentFilterState) => void;
  projects: Project[];
  availableTags: string[];
}

const EMPTY_FILTERS: DocumentFilterState = { projectId: '', tag: '', type: '' };

export function DocumentFilterBar({ filters, onChange, projects, availableTags }: DocumentFilterBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        <Filter size={16} className="mr-1.5" />
        Filters
        {activeCount > 0 && (
          <Badge variant="brass" className="ml-1.5 h-4 min-w-4 justify-center px-1">
            {activeCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 origin-top-right rounded-sm border border-ink-300 bg-bone-50/90 p-4 shadow-md backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-900">Filter documents</span>
            {activeCount > 0 && (
              <button
                onClick={() => onChange(EMPTY_FILTERS)}
                className="flex items-center gap-1 text-xs text-ink-400 hover:text-terracotta-600"
              >
                <X size={12} />
                Clear all
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-doc-project">Project</Label>
              <Select
                id="filter-doc-project"
                value={filters.projectId}
                onChange={(e) => onChange({ ...filters, projectId: e.target.value })}
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-doc-type">Type</Label>
              <Select id="filter-doc-type" value={filters.type} onChange={(e) => onChange({ ...filters, type: e.target.value })}>
                <option value="">All types</option>
                <option value="page">Page</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="recording">Recording</option>
                <option value="pdf">PDF</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-doc-tag">Tag</Label>
              <Select id="filter-doc-tag" value={filters.tag} onChange={(e) => onChange({ ...filters, tag: e.target.value })}>
                <option value="">All tags</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
