import { useEffect, useState } from "react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { CrawlIntervalField } from "@/components/ui/crawl-interval-field";

interface WebsiteTargetCrawlIntervalPanelProps {
  crawlInterval: string;
  isPending: boolean;
  onSave: (crawlInterval: string) => void;
}

export function WebsiteTargetCrawlIntervalPanel({
  crawlInterval,
  isPending,
  onSave,
}: WebsiteTargetCrawlIntervalPanelProps) {
  const [draft, setDraft] = useState(crawlInterval);

  useEffect(() => {
    setDraft(crawlInterval);
  }, [crawlInterval]);

  const isDirty = draft.trim() !== crawlInterval;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Crawl schedule</p>
        <p className="text-xs text-muted">
          How often this website target is scraped automatically in production.
        </p>
      </div>

      <CrawlIntervalField value={draft} disabled={isPending} onChange={setDraft} />

      <div className="mt-4 flex justify-end">
        <ActionButtonWithPending
          isPending={isPending}
          isDisabled={!isDirty || isPending}
          onPress={() => onSave(draft.trim())}
        >
          Save schedule
        </ActionButtonWithPending>
      </div>
    </div>
  );
}
