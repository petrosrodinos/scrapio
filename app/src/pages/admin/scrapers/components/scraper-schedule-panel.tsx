import { useEffect, useState } from "react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { CrawlIntervalField } from "@/components/ui/crawl-interval-field";
import { getCrawlIntervalPresetLabel } from "@/config/constants/dropdowns/website-targets/crawl-interval-preset.options";

interface ScraperSchedulePanelProps {
  scheduleCron: string | null;
  scheduleEnabled: boolean;
  isPending: boolean;
  onSave: (scheduleCron: string | null) => void;
}

export function ScraperSchedulePanel({
  scheduleCron,
  scheduleEnabled,
  isPending,
  onSave,
}: ScraperSchedulePanelProps) {
  const [draft, setDraft] = useState<string | null>(scheduleCron);

  useEffect(() => {
    setDraft(scheduleCron);
  }, [scheduleCron]);

  const dirty = draft !== scheduleCron;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Schedule</p>
        <span className="text-sm text-foreground">
          {scheduleEnabled
            ? getCrawlIntervalPresetLabel(scheduleCron)
            : "Manual only"}
        </span>
        {scheduleEnabled && scheduleCron ? (
          <span className="font-mono text-xs text-muted">{scheduleCron}</span>
        ) : (
          <span className="text-xs text-muted">Runs only when you click Run now</span>
        )}
      </div>

      <CrawlIntervalField value={draft} disabled={isPending} onChange={setDraft} />

      <div className="flex justify-end">
        <ActionButtonWithPending
          isPending={isPending}
          isDisabled={isPending || !dirty}
          onPress={() => onSave(draft)}
        >
          Save schedule
        </ActionButtonWithPending>
      </div>
    </div>
  );
}
