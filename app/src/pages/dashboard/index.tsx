import { Link } from "react-router-dom";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import type {
  ActivityFeedItem,
  DashboardResponse,
} from "@/features/dashboard/interfaces/dashboard.interfaces";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { formatDateTime } from "@/lib/date";
import { useAuthStore } from "@/stores/auth";

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: "color-mix(in oklch, var(--surface-secondary) 80%, transparent)",
        boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--border) 60%, transparent)",
      }}
    >
      <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-semibold text-foreground tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

function KpiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

function resolveActivityLink(item: ActivityFeedItem): string | null {
  if (item.crawl_run_id) {
    return Routes.crawlRuns.detail(item.crawl_run_id);
  }
  if (item.generation_run_id) {
    return Routes.generationRuns.detail(item.generation_run_id);
  }
  if (item.scraper_id) {
    return Routes.scrapers.detail(item.scraper_id, item.website_target_id);
  }
  if (item.website_target_id) {
    return Routes.websiteTargets.detail(item.website_target_id);
  }
  return null;
}

function DashboardBody({ data }: { data: DashboardResponse }) {
  const activity = data.activity_feed ?? [];

  return (
    <>
      <KpiSection title="Scrapers">
        <KpiCard label="Total" value={data.scrapers_total} />
        <KpiCard label="Active" value={data.scrapers_active} />
        <KpiCard label="Broken" value={data.scrapers_broken} />
        <KpiCard label="Running crawls" value={data.running_crawls} />
        <KpiCard label="Failed crawls (24h)" value={data.failed_crawls_24h} />
        <KpiCard label="Last crawl" value={formatDateTime(data.last_crawl_at)} />
      </KpiSection>

      <KpiSection title="Targets">
        <KpiCard label="Website targets" value={data.targets_total} />
        <KpiCard label="Extracted items" value={data.extracted_items_total} />
      </KpiSection>

      <KpiSection title="Queue">
        <KpiCard label="Waiting" value={data.queue_waiting} />
        <KpiCard label="Active" value={data.queue_active} />
        <KpiCard label="Failed" value={data.queue_failed} />
      </KpiSection>

      <KpiSection title="Generation">
        <KpiCard label="Active generation runs" value={data.active_generation_runs} />
      </KpiSection>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--border) 60%, transparent)",
          }}
        >
          {activity.length === 0 ? (
            <p className="p-6 text-sm text-muted">No recent activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((item, index) => {
                const href = resolveActivityLink(item);
                const content = (
                  <div className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-surface-secondary/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{item.message ?? "Activity update"}</p>
                      <p className="text-xs text-muted mt-0.5 capitalize">
                        {item.type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <time className="text-xs text-muted shrink-0 tabular-nums">
                      {formatDateTime(item.occurred_at)}
                    </time>
                  </div>
                );

                return (
                  <li key={`${item.type}-${item.occurred_at}-${index}`}>
                    {href ? (
                      <Link to={href} className="block">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export default function DashboardHome() {
  const { full_name, email } = useAuthStore();
  const { data, isPending } = useDashboard();
  const displayName = full_name || email || "there";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {displayName}
        </p>
        <p className="text-sm text-muted mt-1">Scraper platform overview and recent activity.</p>
      </div>

      {isPending || !data ? (
        <DetailSkeleton fieldCount={8} showSubTable subTableRows={6} />
      ) : (
        <DashboardBody data={data} />
      )}
    </div>
  );
}
