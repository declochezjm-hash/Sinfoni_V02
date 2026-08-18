import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface RichardMarkdownProps {
  text: string;
}

/** Transforme un saut de ligne simple en hard-break Markdown, sans fusionner les paragraphes. */
function preserveLineBreaks(markdown: string): string {
  return markdown.replace(/([^\n])\n(?!\n)/g, '$1  \n');
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="m-0 p-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="m-0 list-disc space-y-0.5 p-0 pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="m-0 list-decimal space-y-0.5 p-0 pl-4">{children}</ol>
  ),
  li: ({ children }) => <li className="m-0 p-0">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <p className="m-0 p-0 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="m-0 p-0 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="m-0 p-0 font-semibold">{children}</p>,
  code: ({ children }) => (
    <code className="rounded bg-slate-200/70 px-1 py-px text-[11px]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="m-0 overflow-x-auto rounded bg-slate-200/50 p-2 text-[11px] leading-snug">
      {children}
    </pre>
  ),
};

export default function RichardMarkdown({ text }: RichardMarkdownProps) {
  return (
    <div className="break-words text-sm leading-relaxed text-slate-800 [&>*+*]:mt-1.5">
      <Markdown components={markdownComponents}>{preserveLineBreaks(text)}</Markdown>
    </div>
  );
}
