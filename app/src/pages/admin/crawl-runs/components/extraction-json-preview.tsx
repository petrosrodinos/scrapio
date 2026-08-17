import { useLayoutEffect, useRef, useState, type FC } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import jsonLanguage from "react-syntax-highlighter/dist/esm/languages/prism/json";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { getOutputFormatLabel } from "@/config/constants/dropdowns/scrapers/output-format-form.options";
import { OutputFormats } from "@/features/scraper-generation/interfaces/output-config.interfaces";
import { useTheme } from "@/hooks/use-theme";
import { ExpandPreviewModal } from "./expand-preview-modal";

SyntaxHighlighter.registerLanguage("json", jsonLanguage);

const COLLAPSED_MAX_HEIGHT_PX = 320;

interface JsonCodeBlockProps {
  json: string;
  maxHeightClassName: string;
}

const JsonCodeBlock: FC<JsonCodeBlockProps> = ({ json, maxHeightClassName }) => {
  const { theme } = useTheme();

  return (
    <div className={cn("rounded-lg border border-border overflow-auto", maxHeightClassName)}>
      <SyntaxHighlighter
        language="json"
        style={theme === "dark" ? oneDark : oneLight}
        customStyle={{ margin: 0, padding: "0.75rem", fontSize: "0.75rem", background: "transparent" }}
        codeTagProps={{ style: { background: "transparent" } }}
      >
        {json}
      </SyntaxHighlighter>
    </div>
  );
};

interface ExtractionJsonPreviewProps {
  data: unknown;
}

export const ExtractionJsonPreview: FC<ExtractionJsonPreviewProps> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {getOutputFormatLabel(OutputFormats.STRUCTURED_JSON)}
        </p>
        <ExpandPreviewModal
          title={getOutputFormatLabel(OutputFormats.STRUCTURED_JSON)}
          triggerAriaLabel="Expand JSON"
        >
          <JsonCodeBlock json={json} maxHeightClassName="max-h-[80vh]" />
        </ExpandPreviewModal>
      </div>
      <div ref={contentRef} className={cn(expanded ? undefined : "max-h-80 overflow-y-auto")}>
        <JsonCodeBlock json={json} maxHeightClassName="max-h-none" />
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
