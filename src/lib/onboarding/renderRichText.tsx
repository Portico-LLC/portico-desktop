import { Fragment, type ReactNode } from 'react';

interface Node {
  type?: string;
  text?: string;
  content?: Node[];
  marks?: Array<{ type: string }>;
  attrs?: Record<string, unknown>;
}

/**
 * Renders the TipTap JSON an owner authored, read-only.
 *
 * A deliberate ~50 lines rather than reusing `DocumentEditor` with `editable={false}`: that
 * component pulls TipTap and its extensions in, and `App.tsx` already code-splits the Documents
 * page specifically to keep them out of the main bundle. The tour mounts inside the app shell
 * on first login, so importing the editor there would undo that split for every user.
 *
 * It handles exactly the node set the builder's toolbar can produce. Anything unrecognised
 * falls through to its children, so an unknown node loses its formatting rather than its text.
 */
export function renderRichText(doc: unknown, keyPrefix = 'r'): ReactNode {
  const root = doc as Node | null;
  if (!root || typeof root !== 'object' || !Array.isArray(root.content)) return null;
  return root.content.map((node, i) => renderNode(node, `${keyPrefix}-${i}`));
}

function renderNode(node: Node, key: string): ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, `${key}-${i}`)) ?? null;

  switch (node.type) {
    case 'text':
      return applyMarks(node, key);
    case 'paragraph':
      return (
        <p key={key} className="mb-2 last:mb-0">
          {children}
        </p>
      );
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2;
      return (
        <p
          key={key}
          className={
            level <= 2
              ? 'mb-1.5 font-display text-base text-ink-900'
              : 'mb-1.5 text-sm font-semibold text-ink-900'
          }
        >
          {children}
        </p>
      );
    }
    case 'bulletList':
      return (
        <ul key={key} className="mb-2 list-disc space-y-1 pl-4 last:mb-0">
          {children}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">
          {children}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'hardBreak':
      return <br key={key} />;
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

function applyMarks(node: Node, key: string): ReactNode {
  let content: ReactNode = node.text ?? '';
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') content = <strong className="font-semibold text-ink-700">{content}</strong>;
    else if (mark.type === 'italic') content = <em>{content}</em>;
    else if (mark.type === 'code') content = <code className="text-[13px] text-ink-700">{content}</code>;
  }
  return <Fragment key={key}>{content}</Fragment>;
}
