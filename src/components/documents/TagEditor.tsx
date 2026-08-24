import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { TagChip } from './TagChip';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagEditor({ tags, onChange, placeholder = 'Add a tag and press Enter' }: TagEditorProps) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const value = draft.trim();
    if (!value || tags.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagChip key={tag} label={tag} onRemove={() => onChange(tags.filter((t) => t !== tag))} />
          ))}
        </div>
      )}
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
          } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={addTag}
      />
    </div>
  );
}
