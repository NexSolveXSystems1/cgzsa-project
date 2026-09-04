"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A deliberately small rich-text field. It produces the same restricted set of
 * tags the server sanitiser allows, so what an editor writes is what survives.
 */
const TOOLS: [string, string, string][] = [
  ["bold", "B", "Bold"],
  ["italic", "I", "Italic"],
  ["formatBlock:h2", "H2", "Heading"],
  ["insertUnorderedList", "•", "Bulleted list"],
  ["insertOrderedList", "1.", "Numbered list"],
  ["createLink", "🔗", "Link"],
  ["formatBlock:blockquote", "❝", "Quote"],
  ["removeFormat", "⌫", "Clear formatting"],
];

export function RichText({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== defaultValue) ref.current.innerHTML = defaultValue;
    // Only on mount: after that the field owns its own content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string) {
    const [command, arg] = cmd.split(":");
    if (command === "createLink") {
      const url = window.prompt("Address to link to");
      if (!url) return;
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand(command, false, arg);
    }
    setHtml(ref.current?.innerHTML ?? "");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-0.5 p-1.5 border border-b-0 border-[var(--color-line-2)] rounded-t-[5px] bg-[var(--color-surface-2)]" role="toolbar" aria-label="Formatting">
        {TOOLS.map(([cmd, label, title]) => (
          <button
            key={cmd}
            type="button"
            title={title}
            aria-label={title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(cmd)}
            className="w-[30px] h-[28px] grid place-items-center rounded border border-transparent text-[0.8rem] text-[var(--color-ink-2)] hover:bg-white hover:border-[var(--color-line)]"
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Body"
        onInput={(e) => setHtml((e.target as HTMLDivElement).innerHTML)}
        className="min-h-[300px] rounded-b-[5px] border border-[var(--color-line-2)] bg-white px-4 py-3.5 text-[0.94rem] leading-relaxed text-[var(--color-ink-2)] focus:outline-2 focus:outline-[var(--color-brand-2)]"
      />
      <input type="hidden" name={name} value={html} />
      <p className="hint mt-1.5">
        Formatting is sanitised on the server against an allow-list before it is stored, and again before it is shown.
      </p>
    </div>
  );
}
