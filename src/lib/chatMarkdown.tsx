/** Minimal, dependency-free markdown for chat bubbles. Shared by Brain chat, Architect's chat
 *  and team chat — all render free text into the same type styles, so this stays in one place
 *  rather than drifting apart in several copies.
 *
 *  Supports **bold**, *italic*, `code`, ~~strike~~, ```fenced blocks```, "- " bullet lists,
 *  bare URLs, and @Name mentions. Deliberately not a full markdown parser: chat text is
 *  short, and anything heavier belongs in the document editor. */

const URL_PATTERN = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;

export interface MentionContext {
  /** Names that should render as mention chips, longest first so "Anna Marie" wins over "Anna". */
  names?: string[];
  /** The current user's name, which gets the stronger fill. */
  selfName?: string;
}

function renderMentionsAndLinks(text: string, keyPrefix: string, ctx?: MentionContext): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const names = (ctx?.names ?? []).slice().sort((a, b) => b.length - a.length);

  // One pass over the string, taking whichever of "a mention here" or "a URL here" starts
  // earliest, so the two never corrupt each other's offsets.
  let rest = text;
  let counter = 0;
  while (rest.length > 0) {
    let mentionIndex = -1;
    let mentionName = '';
    for (const name of names) {
      const found = rest.indexOf(`@${name}`);
      if (found !== -1 && (mentionIndex === -1 || found < mentionIndex)) {
        mentionIndex = found;
        mentionName = name;
      }
    }

    URL_PATTERN.lastIndex = 0;
    const urlMatch = URL_PATTERN.exec(rest);
    const urlIndex = urlMatch ? urlMatch.index : -1;

    if (mentionIndex === -1 && urlIndex === -1) {
      nodes.push(rest);
      break;
    }

    const mentionFirst = mentionIndex !== -1 && (urlIndex === -1 || mentionIndex < urlIndex);
    if (mentionFirst) {
      if (mentionIndex > 0) nodes.push(rest.slice(0, mentionIndex));
      const isSelf = ctx?.selfName && mentionName === ctx.selfName;
      nodes.push(
        <span
          key={`${keyPrefix}-m-${counter++}`}
          className={
            isSelf
              ? 'rounded-sm bg-brass-200 px-1 py-px font-medium text-brass-900'
              : 'rounded-sm bg-brass-50 px-1 py-px font-medium text-brass-700'
          }
        >
          @{mentionName}
        </span>,
      );
      rest = rest.slice(mentionIndex + mentionName.length + 1);
    } else {
      if (urlIndex > 0) nodes.push(rest.slice(0, urlIndex));
      const href = urlMatch![1];
      nodes.push(
        <a
          key={`${keyPrefix}-a-${counter++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pine-700 underline decoration-pine-300 underline-offset-2 hover:decoration-pine-600"
        >
          {href}
        </a>,
      );
      rest = rest.slice(urlIndex + href.length);
    }
  }

  return nodes;
}

/** Inline emphasis. Split on every delimiter at once so nesting can't produce stray markers. */
function renderInline(text: string, keyPrefix: string, ctx?: MentionContext): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|(?<![*\w])\*[^*\s][^*]*\*)/g);

  return parts.filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{renderMentionsAndLinks(part.slice(2, -2), key, ctx)}</strong>;
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return <s key={key} className="opacity-70">{renderMentionsAndLinks(part.slice(2, -2), key, ctx)}</s>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="rounded-sm border border-ink-200 bg-ink-50 px-1 py-px font-mono text-[0.9em] text-ink-800">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{renderMentionsAndLinks(part.slice(1, -1), key, ctx)}</em>;
    }
    return <span key={key}>{renderMentionsAndLinks(part, key, ctx)}</span>;
  });
}

export function renderMarkdownLite(text: string, ctx?: MentionContext): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let codeBuffer: string[] | null = null;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key} className="my-1 list-disc space-y-0.5 pl-4">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`, ctx)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    // Fenced code blocks swallow everything, including markers that would otherwise be
    // treated as emphasis.
    if (line.trim().startsWith('```')) {
      if (codeBuffer === null) {
        flushList(`list-${idx}`);
        codeBuffer = [];
        continue;
      } else {
        nodes.push(
          <pre
            key={`code-${idx}`}
            className="my-1.5 overflow-x-auto rounded-md border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-[13px] leading-relaxed text-ink-800"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>,
        );
        codeBuffer = null;
      }
      continue;
    }
    if (codeBuffer !== null) {
      codeBuffer.push(line);
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
      continue;
    }
    flushList(`list-${idx}`);
    if (line.trim() === '') {
      nodes.push(<div key={`br-${idx}`} className="h-2" />);
    } else {
      nodes.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`, ctx)}</p>);
    }
  }

  // An unterminated fence still has to render, or the message would silently vanish.
  if (codeBuffer !== null && codeBuffer.length) {
    nodes.push(
      <pre
        key="code-end"
        className="my-1.5 overflow-x-auto rounded-md border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-[13px] leading-relaxed text-ink-800"
      >
        <code>{codeBuffer.join('\n')}</code>
      </pre>,
    );
  }
  flushList('list-end');

  return <>{nodes}</>;
}
