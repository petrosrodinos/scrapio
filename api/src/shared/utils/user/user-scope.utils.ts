import { Prisma } from 'generated/prisma';

export function websiteTargetUserWhere(userId: string) {
  return { user_id: userId };
}

export function scraperUserWhere(userId: string): Prisma.ScraperWhereInput {
  return { user_id: userId };
}

export function generationRunUserWhere(
  userId: string,
): Prisma.ScraperGenerationRunWhereInput {
  return { website_target: { user_id: userId } };
}

export function crawlRunUserWhere(userId: string): Prisma.CrawlRunWhereInput {
  return { user_id: userId };
}

export function diagnosticsUserWhere(
  userId: string,
): Prisma.DiagnosticsPackageWhereInput {
  return { scraper: { user_id: userId } };
}

export function jobLogUserWhere(userId: string): Prisma.JobLogWhereInput {
  return { crawl_run: { user_id: userId } };
}
