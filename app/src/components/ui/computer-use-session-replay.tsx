import { useState } from "react";
import { EmptyState } from "@heroui/react";
import { ImageOff, X } from "lucide-react";

export interface ComputerUseSessionStep {
  id: string;
  step_index: number;
  action_type: string;
  model_reasoning: string | null;
  screenshot_before_url: string | null;
  screenshot_after_url: string | null;
}

interface ComputerUseSessionReplayProps {
  steps: ComputerUseSessionStep[];
  isActive?: boolean;
  emptyActiveMessage?: string;
  emptyIdleMessage?: string;
}

export function ComputerUseSessionReplay({
  steps,
  isActive = false,
  emptyActiveMessage = "Waiting for the first step...",
  emptyIdleMessage = "No steps were recorded for this run.",
}: ComputerUseSessionReplayProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="text-sm font-medium text-foreground">Session replay</p>
          {steps.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {steps.map((step) => (
                <a
                  key={step.id}
                  href={`#step-${step.step_index}`}
                  className="flex h-6 min-w-6 items-center justify-center rounded-md border border-border px-1.5 text-xs text-muted hover:text-foreground hover:border-accent/50"
                >
                  {step.step_index}
                </a>
              ))}
            </div>
          )}
        </div>

        {steps.length === 0 ? (
          <EmptyState>
            <p className="text-sm text-muted">
              {isActive ? emptyActiveMessage : emptyIdleMessage}
            </p>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            {steps.map((step) => (
              <div
                key={step.id}
                id={`step-${step.step_index}`}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 scroll-mt-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-medium text-foreground">
                    {step.step_index}
                  </span>
                  <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                    {step.action_type.replace(/_/g, " ")}
                  </span>
                </div>

                {step.model_reasoning && (
                  <p className="text-sm text-muted">{step.model_reasoning}</p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <ScreenshotThumb
                    label="Before"
                    url={step.screenshot_before_url}
                    onEnlarge={setLightboxUrl}
                  />
                  <ScreenshotThumb
                    label="After"
                    url={step.screenshot_after_url}
                    onEnlarge={setLightboxUrl}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Screenshot"
            className="max-h-full max-w-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function ScreenshotThumb({
  label,
  url,
  onEnlarge,
}: {
  label: string;
  url: string | null;
  onEnlarge: (url: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {url ? (
        <button
          type="button"
          onClick={() => onEnlarge(url)}
          className="overflow-hidden rounded-lg border border-border hover:border-accent/50 transition-colors"
        >
          <img src={url} alt={`${label} screenshot`} className="w-full h-auto" />
        </button>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-border bg-background h-24 text-muted">
          <ImageOff className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
