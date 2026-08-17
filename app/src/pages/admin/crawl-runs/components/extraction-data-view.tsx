import { useMemo, useState, type FC } from "react";
import { Sparkles } from "lucide-react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { cn } from "@/lib/utils";
import {
  useGenerateCrawlRunPageUi,
  useGenerateCrawlRunUi,
} from "@/features/crawl-runs/hooks/use-crawl-runs";
import { ExtractionJsonPreview } from "./extraction-json-preview";
import { ExtractionMarkdownPreview } from "./extraction-markdown-preview";
import { GeneratedUiFrame } from "./generated-ui-frame";

const Tabs = {
  MARKDOWN: "markdown",
  JSON: "json",
  INTERFACE: "interface",
} as const;
type Tab = (typeof Tabs)[keyof typeof Tabs];

interface ExtractionDataViewProps {
  runId: string;
  /** Present only for the per-page (PLAIN_SCRAPE PER_URL) case; omitted for the combined run-level case. */
  pageId?: string;
  structuredData: Record<string, unknown> | null;
  generatedUiHtml: string | null;
  markdown: string | null;
}

export const ExtractionDataView: FC<ExtractionDataViewProps> = ({
  runId,
  pageId,
  structuredData,
  generatedUiHtml,
  markdown,
}) => {
  const tabDefinitions = useMemo(
    () => [
      { id: Tabs.MARKDOWN, label: "Markdown", visible: !!markdown },
      { id: Tabs.JSON, label: "JSON", visible: !!structuredData },
      { id: Tabs.INTERFACE, label: "Interface", visible: true },
    ],
    [markdown, structuredData],
  );
  const visibleTabs = tabDefinitions.filter((definition) => definition.visible);

  const [tab, setTab] = useState<Tab>(() => visibleTabs[0]?.id ?? Tabs.INTERFACE);
  const activeTab = visibleTabs.some((definition) => definition.id === tab)
    ? tab
    : (visibleTabs[0]?.id ?? Tabs.INTERFACE);

  const generateRunUi = useGenerateCrawlRunUi();
  const generateForPage = useGenerateCrawlRunPageUi();

  const isPending = pageId ? generateForPage.isPending : generateRunUi.isPending;

  const handleGenerate = () => {
    if (pageId) {
      generateForPage.mutate(
        { id: runId, pageId },
        { onSuccess: () => setTab(Tabs.INTERFACE) },
      );
    } else {
      generateRunUi.mutate(runId, { onSuccess: () => setTab(Tabs.INTERFACE) });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          role="tablist"
          aria-label="Extraction data view"
          className="inline-flex shrink-0 rounded-lg border border-border bg-surface-secondary p-0.5"
        >
          {visibleTabs.map((definition) => (
            <button
              key={definition.id}
              type="button"
              role="tab"
              aria-selected={activeTab === definition.id}
              onClick={() => setTab(definition.id)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                activeTab === definition.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {definition.label}
            </button>
          ))}
        </div>

        {structuredData ? (
          <ActionButtonWithPending
            type="button"
            size="sm"
            variant="secondary"
            idleLeading={<Sparkles className="h-3.5 w-3.5" />}
            isPending={isPending}
            isDisabled={isPending}
            onPress={handleGenerate}
          >
            {generatedUiHtml ? "Regenerate interface" : "Generate interface"}
          </ActionButtonWithPending>
        ) : null}
      </div>

      {activeTab === Tabs.MARKDOWN ? (
        <ExtractionMarkdownPreview markdown={markdown!} />
      ) : activeTab === Tabs.JSON ? (
        <ExtractionJsonPreview data={structuredData!} />
      ) : generatedUiHtml ? (
        <GeneratedUiFrame html={generatedUiHtml} />
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">
            No interface generated yet. Click "Generate interface" to render this data as a UI.
          </p>
        </div>
      )}
    </div>
  );
};
