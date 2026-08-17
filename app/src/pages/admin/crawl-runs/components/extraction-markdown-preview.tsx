import { useLayoutEffect, useRef, useState, type FC } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ExpandPreviewModal } from "./expand-preview-modal";

const REMARK_PLUGINS = [remarkGfm];
const COLLAPSED_MAX_HEIGHT_PX = 320;

const markdownBodyClass = cn(
  "text-sm text-foreground leading-relaxed",
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-foreground first:[&_h1]:mt-0",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground first:[&_h2]:mt-0",
  "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground first:[&_h3]:mt-0",
  "[&_p]:mb-3 last:[&_p]:mb-0",
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:mb-1",
  "[&_a]:text-accent [&_a]:underline",
  "[&_blockquote]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted",
  "[&_code]:rounded [&_code]:bg-surface-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-3 [&_pre]:text-xs",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
  "[&_th]:border [&_th]:border-border [&_th]:bg-surface-secondary [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
  "[&_hr]:my-4 [&_hr]:border-border",
  "[&_img]:max-w-full [&_img]:rounded-lg",
);

interface ExtractionMarkdownPreviewProps {
  markdown: string;
}

export const ExtractionMarkdownPreview: FC<ExtractionMarkdownPreviewProps> = ({ markdown }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      setOverflows(el.scrollHeight > COLLAPSED_MAX_HEIGHT_PX);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [markdown]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Markdown</p>
        <ExpandPreviewModal title="Markdown" triggerAriaLabel="Expand markdown">
          <div className={cn(markdownBodyClass, "max-h-[80vh] overflow-y-auto")}>
            <Markdown remarkPlugins={REMARK_PLUGINS}>{markdown}</Markdown>
          </div>
        </ExpandPreviewModal>
      </div>
      <div className="relative">
        <div className={cn(expanded ? undefined : "max-h-80 overflow-y-auto")}>
          <div ref={contentRef} className={markdownBodyClass}>
            <Markdown remarkPlugins={REMARK_PLUGINS}>{markdown}</Markdown>
          </div>
        </div>
      </div>
      {overflows ? (
        <button
          type="button"
          className="text-sm text-accent hover:underline self-start"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
};
