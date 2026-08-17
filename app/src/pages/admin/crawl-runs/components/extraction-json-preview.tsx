import { useLayoutEffect, useRef, useState, type FC } from "react";
import { cn } from "@/lib/utils";
import { getOutputFormatLabel } from "@/config/constants/dropdowns/scrapers/output-format-form.options";
import { OutputFormats } from "@/features/scraper-generation/interfaces/output-config.interfaces";

const COLLAPSED_MAX_HEIGHT_PX = 320;

interface ExtractionJsonPreviewProps {
  data: unknown;
}

export const ExtractionJsonPreview: FC<ExtractionJsonPreviewProps> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLPreElement>(null);
  const json = JSON.stringify(data, null, 2);

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
  }, [json]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">
        {getOutputFormatLabel(OutputFormats.STRUCTURED_JSON)}
      </p>
      <div className={cn(expanded ? undefined : "max-h-80 overflow-y-auto")}>
        <pre
          ref={contentRef}
          className="rounded-lg border border-border bg-background p-3 text-xs overflow-x-auto whitespace-pre"
        >
          {json}
        </pre>
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
