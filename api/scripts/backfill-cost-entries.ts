/**
 * One-off backfill: populate cost_entries from historical data that already exists elsewhere —
 * ExtractionResult.ai_usage (exact per-call cost, already computed) and WorkflowRun.ai_usage for
 * BROWSER_AGENT runs (token counts only, no price — priced here using each user's currently
 * configured computer-use model as a best-effort proxy for "whichever model was used at the
 * time", since the historical model isn't recorded anywhere). A third pass fills in provider/model
 * for rows that still lack them (ExtractionResult.ai_usage never recorded which provider/model was
 * used), same best-effort-proxy caveat. Safe to re-run: every inserted/updated row is tagged with a
 * unique backfill key or `estimated_model` in metadata and skipped/left alone on subsequent runs.
 */
import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { calculateAiCost } from '../src/integrations/ai/utils/ai-cost';
import { AiProviders } from '../src/integrations/ai/interfaces/ai.interface';
import { getComputerUseModelApiId } from '../src/shared/config/integrations/computer-use-models.config';
import { integrationTypeToAiProvider } from '../src/integrations/ai/utils/integration-type-to-ai-provider';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

interface AiUsageEntry {
  stage: 'structured' | 'markdown';
  attempt: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
}

async function backfillExtractionResultCosts() {
  const results = await prisma.$queryRawUnsafe<
    {
      id: string;
      ai_usage: AiUsageEntry[];
      created_at: Date;
      user_id: string | null;
      workflow_run_id: string | null;
    }[]
  >(`
    SELECT
      er.id,
      er.ai_usage,
      er.created_at,
      COALESCE(er.workflow_run_id, psp.workflow_run_id) AS workflow_run_id,
      wr.user_id
    FROM extraction_results er
    LEFT JOIN plain_scraped_pages psp ON psp.id = er.plain_scraped_page_id
    LEFT JOIN workflow_runs wr ON wr.id = COALESCE(er.workflow_run_id, psp.workflow_run_id)
    WHERE er.ai_usage IS NOT NULL
  `);

  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoUser = 0;
  let errored = 0;
  let totalCost = 0;

  for (const row of results) {
    if (!row.user_id || !row.workflow_run_id) {
      skippedNoUser += 1;
      continue;
    }

    const entries = Array.isArray(row.ai_usage) ? row.ai_usage : [];

    for (const entry of entries) {
      if (!entry?.usage || typeof entry.usage.totalCost !== 'number') continue;

      const backfillKey = `extraction_result:${row.id}:${entry.stage}:${entry.attempt}`;

      try {
        const existing = await prisma.costEntry.findFirst({
          where: { metadata: { path: ['backfill_key'], equals: backfillKey } },
          select: { id: true },
        });
        if (existing) {
          skippedExisting += 1;
          continue;
        }

        await prisma.costEntry.create({
          data: {
            user_id: row.user_id,
            category:
              entry.stage === 'markdown'
                ? 'MARKDOWN_GENERATION'
                : 'STRUCTURED_EXTRACTION',
            amount: entry.usage.totalCost,
            currency: 'USD',
            workflow_run_id: row.workflow_run_id,
            created_at: row.created_at,
            metadata: {
              backfill: true,
              backfill_key: backfillKey,
              source: 'extraction_result.ai_usage',
              extraction_result_id: row.id,
              stage: entry.stage,
              attempt: entry.attempt,
              input_tokens: entry.usage.inputTokens,
              output_tokens: entry.usage.outputTokens,
            },
          },
        });

        inserted += 1;
        totalCost += entry.usage.totalCost;
      } catch (error) {
        errored += 1;
        console.error(
          `  failed to backfill ${backfillKey}: ${(error as Error).message}`,
        );
      }
    }
  }

  console.log(
    `[extraction_result.ai_usage] inserted=${inserted} skipped_existing=${skippedExisting} skipped_no_user=${skippedNoUser} errored=${errored} total_cost=${totalCost.toFixed(6)}`,
  );
}

async function backfillBrowserAgentCosts() {
  const runs = await prisma.$queryRawUnsafe<
    {
      id: string;
      user_id: string;
      ai_usage: {
        input_tokens: number;
        output_tokens: number;
        model_calls: number;
      };
      created_at: Date;
    }[]
  >(`
    SELECT id, user_id, ai_usage, created_at
    FROM workflow_runs
    WHERE type = 'BROWSER_AGENT' AND ai_usage IS NOT NULL
  `);

  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoTokens = 0;
  let skippedNoModel = 0;
  let errored = 0;
  let totalCost = 0;

  const modelCache = new Map<string, string | null>();

  async function resolveUserComputerUseModel(
    userId: string,
  ): Promise<string | null> {
    if (modelCache.has(userId)) return modelCache.get(userId)!;

    const integration = await prisma.userIntegration.findFirst({
      where: {
        user_id: userId,
        integration_type: 'ANTHROPIC',
        computer_use_model: { not: null },
      },
      orderBy: [{ is_default: 'desc' }, { updated_at: 'desc' }],
      select: { computer_use_model: true },
    });

    const apiModel = integration?.computer_use_model
      ? getComputerUseModelApiId(integration.computer_use_model)
      : null;

    modelCache.set(userId, apiModel);
    return apiModel;
  }

  for (const run of runs) {
    const usage = run.ai_usage;
    const inputTokens = usage?.input_tokens ?? 0;
    const outputTokens = usage?.output_tokens ?? 0;
    const modelCalls = usage?.model_calls ?? 0;

    if (modelCalls <= 0 || (inputTokens === 0 && outputTokens === 0)) {
      skippedNoTokens += 1;
      continue;
    }

    const backfillKey = `browser_agent:${run.id}`;

    try {
      const existing = await prisma.costEntry.findFirst({
        where: {
          workflow_run_id: run.id,
          category: 'BROWSER_AGENT_RUN',
        },
        select: { id: true },
      });
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      const model = await resolveUserComputerUseModel(run.user_id);
      if (!model) {
        skippedNoModel += 1;
        continue;
      }

      const cost = calculateAiCost({
        provider: AiProviders.anthropic,
        model,
        inputTokens,
        outputTokens,
      });

      await prisma.costEntry.create({
        data: {
          user_id: run.user_id,
          category: 'BROWSER_AGENT_RUN',
          provider: AiProviders.anthropic,
          model,
          amount: cost.totalCost,
          currency: 'USD',
          workflow_run_id: run.id,
          created_at: run.created_at,
          metadata: {
            backfill: true,
            backfill_key: backfillKey,
            source: 'workflow_run.ai_usage',
            estimated_model: true,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            model_calls: modelCalls,
          },
        },
      });

      inserted += 1;
      totalCost += cost.totalCost;
    } catch (error) {
      errored += 1;
      console.error(
        `  failed to backfill ${backfillKey}: ${(error as Error).message}`,
      );
    }
  }

  console.log(
    `[workflow_run.ai_usage BROWSER_AGENT] inserted=${inserted} skipped_existing=${skippedExisting} skipped_no_tokens=${skippedNoTokens} skipped_no_model=${skippedNoModel} errored=${errored} total_cost=${totalCost.toFixed(6)}`,
  );
}

/**
 * extraction_results.ai_usage never recorded which provider/model produced each entry (just
 * tokens + cost), so the two extraction-based categories land with provider/model = null. Fill
 * those in using each user's currently configured default AI integration as a best-effort proxy,
 * same caveat as the browser-agent model backfill above.
 */
async function backfillMissingProviderModel() {
  const rows = await prisma.costEntry.findMany({
    where: {
      provider: null,
      category: { in: ['STRUCTURED_EXTRACTION', 'MARKDOWN_GENERATION'] },
    },
    select: { id: true, user_id: true, metadata: true },
  });

  let updated = 0;
  let skippedNoIntegration = 0;
  let errored = 0;

  const integrationCache = new Map<
    string,
    { provider: string; model: string } | null
  >();

  async function resolveUserDefaultAi(userId: string) {
    if (integrationCache.has(userId)) return integrationCache.get(userId)!;

    const integration = await prisma.userIntegration.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        ai_model: { not: null },
        integration_type: { in: ['OPENAI', 'GEMINI', 'DEEPSEEK'] },
      },
      orderBy: [{ is_default: 'desc' }, { updated_at: 'desc' }],
      select: { integration_type: true, ai_model: true },
    });

    const resolved = integration?.ai_model
      ? {
          provider: integrationTypeToAiProvider(integration.integration_type),
          model: getComputerUseModelApiId(integration.ai_model),
        }
      : null;

    integrationCache.set(userId, resolved);
    return resolved;
  }

  for (const row of rows) {
    try {
      const resolved = await resolveUserDefaultAi(row.user_id);
      if (!resolved) {
        skippedNoIntegration += 1;
        continue;
      }

      const metadata =
        row.metadata &&
        typeof row.metadata === 'object' &&
        !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};

      await prisma.costEntry.update({
        where: { id: row.id },
        data: {
          provider: resolved.provider,
          model: resolved.model,
          metadata: { ...metadata, estimated_model: true },
        },
      });

      updated += 1;
    } catch (error) {
      errored += 1;
      console.error(
        `  failed to backfill provider/model for ${row.id}: ${(error as Error).message}`,
      );
    }
  }

  console.log(
    `[provider/model backfill] updated=${updated} skipped_no_integration=${skippedNoIntegration} errored=${errored}`,
  );
}

async function main() {
  await backfillExtractionResultCosts();
  await backfillBrowserAgentCosts();
  await backfillMissingProviderModel();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
