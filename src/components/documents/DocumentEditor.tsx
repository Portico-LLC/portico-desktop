import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentEditorProps {
  content: unknown;
  onChange?: (json: unknown) => void;
  editable?: boolean;
}

function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-sm text-ink-600 transition-colors hover:bg-ink-100',
        active && 'bg-pine-100 text-pine-800',
      )}
    >
      {children}
    </button>
  );
}

export function DocumentEditor({ content, onChange, editable = true }: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Start writing…' })],
    content: (content as any) ?? '',
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[300px] px-4 py-3 text-sm leading-relaxed text-ink-900 focus:outline-none',
          '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-display [&_h2]:font-semibold',
          '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-lg [&_h3]:font-display [&_h3]:font-semibold',
          '[&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5',
          '[&_strong]:font-semibold [&_em]:italic',
          '[&_.is-editor-empty:first-child::before]:text-ink-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
        ),
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={cn(editable && 'rounded-md border border-ink-300 bg-bone-50')}>
      {editable && (
        <div className="flex items-center gap-1 border-b border-ink-200 px-2 py-1.5">
          <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={15} />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 size={15} />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton
            label="Ordered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={15} />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
