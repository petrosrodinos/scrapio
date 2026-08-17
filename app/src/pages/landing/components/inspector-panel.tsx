import type { CSSProperties, FC } from "react";
import { MousePointer2 } from "lucide-react";

const JSON_LINES = [
  { d: "0.05s", key: '"title"', value: '"Oak Writing Desk"' },
  { d: "0.15s", key: '"price"', value: "249.00" },
  { d: "0.25s", key: '"in_stock"', value: "true" },
  { d: "0.35s", key: '"url"', value: '"acme-store.com/products/oak-desk"' },
];

export const InspectorPanel: FC = () => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      {/* browser chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-secondary px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <div className="landing-display flex-1 truncate rounded-md bg-background px-3 py-1 text-xs text-muted">
          acme-store.com/products/oak-desk
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-[11px] text-accent sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          agent active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* mock page being watched */}
        <div className="relative border-b border-border p-6 md:border-b-0 md:border-r">
          <p className="landing-display mb-4 text-[11px] uppercase tracking-wider text-muted">
            what the agent sees
          </p>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 h-24 rounded-lg bg-surface-tertiary" />
            <p className="text-sm font-medium text-foreground">Oak Writing Desk</p>
            <div className="mt-7 flex items-center gap-2">
              <span className="relative inline-flex items-center rounded border border-dashed border-accent px-1.5 py-0.5 text-sm text-accent">
                <span className="landing-display absolute -top-7 left-0 whitespace-nowrap rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent">
                  span.price
                </span>
                $249.00
              </span>
              <span className="text-xs text-muted">· In stock</span>
            </div>
          </div>

          <MousePointer2
            aria-hidden
            className="agent-cursor absolute h-4 w-4 -rotate-12 text-accent"
            style={{ top: "64%", left: "71%" }}
          />
        </div>

        {/* extraction + self-heal */}
        <div className="p-6">
          <p className="landing-display mb-4 text-[11px] uppercase tracking-wider text-muted">
            what your endpoint gets
          </p>

          <pre className="landing-display overflow-x-auto rounded-xl border border-border bg-background p-4 text-[13px] leading-relaxed">
            <code>
              <span className="text-muted">{"{"}</span>
              {"\n"}
              {JSON_LINES.map((line, i) => (
                <span
                  key={line.key}
                  className="json-line block pl-4"
                  style={{ "--d": line.d } as CSSProperties}
                >
                  <span className="text-accent">{line.key}</span>
                  <span className="text-muted">: </span>
                  <span className="text-foreground">{line.value}</span>
                  {i < JSON_LINES.length - 1 && <span className="text-muted">,</span>}
                </span>
              ))}
              <span className="text-muted">{"}"}</span>
            </code>
          </pre>

          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <p className="landing-display mb-2 text-[11px] uppercase tracking-wider text-muted">
              two weeks later, the site redesigns
            </p>
            <p className="landing-display heal-old text-[13px] text-danger line-through decoration-2">
              selector: .product-card .price
            </p>
            <p className="landing-display heal-new text-[13px] text-warning">
              selector: [data-testid="price"]
            </p>
            <p className="heal-note mt-2 text-xs text-muted">
              Agent re-mapped it in 4.2s — 0 runs missed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
