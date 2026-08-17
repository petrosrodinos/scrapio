import type { FC } from "react";
import { ExpandPreviewModal } from "./expand-preview-modal";

interface GeneratedUiFrameProps {
  html: string;
}

export const GeneratedUiFrame: FC<GeneratedUiFrameProps> = ({ html }) => {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Interface</p>
        <ExpandPreviewModal title="Generated interface" triggerAriaLabel="Expand interface">
          <iframe
            title="Generated interface preview (expanded)"
            srcDoc={html}
            sandbox="allow-same-origin"
            className="w-full h-[80vh] rounded-lg border border-border bg-white"
          />
        </ExpandPreviewModal>
      </div>
      <iframe
        title="Generated interface preview"
        srcDoc={html}
        sandbox="allow-same-origin"
        className="w-full min-h-[24rem] rounded-lg border border-border bg-white"
      />
    </div>
  );
};
