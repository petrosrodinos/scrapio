import { useMemo, useState } from "react";
import { Select, ListBox, Table, Pagination } from "@heroui/react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useCostEntries, useCostSummary } from "@/features/costs/hooks/use-costs";
import type { CostQuery } from "@/features/costs/interfaces/costs.interfaces";
import { CostCategoryFilterOptions } from "@/config/constants/dropdowns/costs/cost-category-filter.options";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { CostCategoryChip } from "./cost-category-chip";

function toStartOfDayIso(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toEndOfDayIso(date: string) {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
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

export function CostsListPage() {
  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo<CostQuery>(
    () => ({
      ...(category !== "all" && { category: category as CostQuery["category"] }),
      ...(dateFrom && { date_from: toStartOfDayIso(dateFrom) }),
      ...(dateTo && { date_to: toEndOfDayIso(dateTo) }),
    }),
    [category, dateFrom, dateTo],
  );

  const query = useMemo<CostQuery>(() => ({ page, limit: 20, ...filters }), [page, filters]);

  const { data: summary, isPending: isSummaryPending } = useCostSummary(filters);
  const { data, isPending } = useCostEntries(query);

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">Costs</p>
        <p className="text-sm text-muted">
          Metered costs incurred on your behalf — AI generation, computer-use agent runs, and
          other billable usage.
        </p>
      </div>

      {isSummaryPending || !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SummaryCard
            label="Total cost"
            value={formatCurrency(summary.total_cost, summary.currency)}
          />
          {summary.by_category.map((group) => (
            <SummaryCard
              key={group.category}
              label={
                CostCategoryFilterOptions.find((option) => option.id === group.category)
                  ?.label ?? group.category
              }
              value={formatCurrency(group.total_cost, summary.currency)}
              sub={`${group.entries_count} entries`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Select
          aria-label="Filter by category"
          selectedKey={category}
          onSelectionChange={(key) => {
            setPage(1);
            setCategory(key as string);
          }}
          className="w-48"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={CostCategoryFilterOptions}>
              {(option) => <ListBox.Item id={option.id}>{option.label}</ListBox.Item>}
            </ListBox>
          </Select.Popover>
        </Select>

        <DatePickerField
          aria-label="From date"
          value={dateFrom}
          onChange={(next) => {
            setPage(1);
            setDateFrom(next);
          }}
        />
        <DatePickerField
          aria-label="To date"
          value={dateTo}
          onChange={(next) => {
            setPage(1);
            setDateTo(next);
          }}
        />
      </div>

      {isPending ? (
        <TableSkeleton rows={8} columns={5} />
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted">
          No cost entries found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Cost entries">
                <Table.Header>
                  <Table.Column isRowHeader>Category</Table.Column>
                  <Table.Column>Provider</Table.Column>
                  <Table.Column>Model</Table.Column>
                  <Table.Column>Amount</Table.Column>
                  <Table.Column>Recorded</Table.Column>
                </Table.Header>
                <Table.Body>
                  {entries.map((entry) => (
                    <Table.Row key={entry.id} id={entry.id}>
                      <Table.Cell>
                        <CostCategoryChip category={entry.category} />
                      </Table.Cell>
                      <Table.Cell>{entry.provider ?? "—"}</Table.Cell>
                      <Table.Cell>{entry.model ?? "—"}</Table.Cell>
                      <Table.Cell>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatCurrency(entry.amount, entry.currency)}
                        </span>
                      </Table.Cell>
                      <Table.Cell>{formatDateTime(entry.created_at)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <Pagination>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={!pagination.has_prev}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Pagination.Previous>
            </Pagination.Item>
            <Pagination.Item>
              <Pagination.Summary>
                Page {pagination.page} of {pagination.total_pages}
              </Pagination.Summary>
            </Pagination.Item>
            <Pagination.Item>
              <Pagination.Next
                isDisabled={!pagination.has_next}
                onPress={() => setPage((p) => p + 1)}
              >
                Next
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      )}
    </div>
  );
}
