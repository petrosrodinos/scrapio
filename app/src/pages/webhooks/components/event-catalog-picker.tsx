import { useState } from "react";
import { Button, Checkbox, FieldError } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WebhookEventCatalogEntry, WebhookEventType } from "@/features/webhooks/interfaces/webhooks.interfaces";

interface EventCatalogPickerProps {
  catalog: WebhookEventCatalogEntry[];
  value: WebhookEventType[];
  onChange: (value: WebhookEventType[]) => void;
  isDisabled?: boolean;
  error?: string;
}

function toggleEvent(
  events: WebhookEventType[],
  eventType: WebhookEventType,
  selected: boolean,
): WebhookEventType[] {
  if (selected) {
    return events.includes(eventType) ? events : [...events, eventType];
  }
  return events.filter((value) => value !== eventType);
}

export function EventCatalogPicker({
  catalog,
  value,
  onChange,
  isDisabled,
  error,
}: EventCatalogPickerProps) {
  const [expandedPayloads, setExpandedPayloads] = useState<Set<string>>(() => new Set());

  const allEventTypes = catalog.map((entry) => entry.event_type);
  const allSelected =
    allEventTypes.length > 0 && allEventTypes.every((eventType) => value.includes(eventType));

  const togglePayload = (eventType: string) => {
    setExpandedPayloads((current) => {
      const next = new Set(current);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Events</span>
          <span className="text-xs text-muted">
            Choose which events this endpoint should receive.
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          isDisabled={isDisabled || catalog.length === 0}
          onPress={() => onChange(allSelected ? [] : allEventTypes)}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </Button>
      </div>

      <div className="flex max-h-[min(24rem,40vh)] flex-col gap-2 overflow-y-auto pe-1">
        {catalog.map((entry) => {
          const selected = value.includes(entry.event_type);
          const payloadExpanded = expandedPayloads.has(entry.event_type);
          return (
            <div
              key={entry.event_type}
              className={cn(
                "rounded-lg border transition-colors",
                selected ? "border-accent bg-accent/5" : "border-border bg-surface",
              )}
            >
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 px-3 py-2.5",
                  isDisabled && "pointer-events-none opacity-60",
                )}
              >
                <Checkbox
                  aria-label={entry.label}
                  isSelected={selected}
                  isDisabled={isDisabled}
                  onChange={(isSelected) => onChange(toggleEvent(value, entry.event_type, isSelected))}
                  className="mt-0.5"
                >
                  <Checkbox.Control className="size-5">
                    <Checkbox.Indicator className="size-3.5" />
                  </Checkbox.Control>
                </Checkbox>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{entry.label}</span>
                  <span className="text-xs leading-snug text-muted">{entry.description}</span>
                  <code className="font-mono text-xs text-muted">{entry.name}</code>
                </span>
              </label>

              <button
                type="button"
                className="flex w-full items-center gap-1 px-3 pb-2 text-xs font-medium text-muted"
                onClick={() => togglePayload(entry.event_type)}
                aria-expanded={payloadExpanded}
              >
                Sample payload
                <ChevronDown
                  className={cn("size-3.5 transition-transform", payloadExpanded && "rotate-180")}
                />
              </button>

              {payloadExpanded ? (
                <pre className="mx-3 mb-3 max-h-60 overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
                  {JSON.stringify(entry.sample_payload, null, 2)}
                </pre>
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
