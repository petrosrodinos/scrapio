import { AuthRole, Prisma } from 'generated/prisma';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';

export function canAccessAllUsers(role: AuthRole): boolean {
  return role === AuthRole.SUPER_ADMIN || role === AuthRole.ADMIN;
}

export function resolveScopeUserId(
  authUser: AuthUser,
  queryUserId?: string,
): string | undefined {
  if (canAccessAllUsers(authUser.role)) {
    return queryUserId;
  }
  return authUser.id;
}

export function websiteTargetUserWhere(
  authUser: AuthUser,
  queryUserId?: string,
): Prisma.WebsiteTargetWhereInput {
  const scopeId = resolveScopeUserId(authUser, queryUserId);
  return scopeId ? { user_id: scopeId } : {};
}

export function scraperUserWhere(
  authUser: AuthUser,
  queryUserId?: string,
): Prisma.ScraperWhereInput {
  const scopeId = resolveScopeUserId(authUser, queryUserId);
  return scopeId ? { user_id: scopeId } : {};
}

export function generationRunUserWhere(
  authUser: AuthUser,
  queryUserId?: string,
): Prisma.ScraperGenerationRunWhereInput {
  const scopeId = resolveScopeUserId(authUser, queryUserId);
  if (!scopeId) {
    return {};
  }
  return { website_target: { user_id: scopeId } };
}

export function crawlRunUserWhere(
  authUser: AuthUser,
  queryUserId?: string,
): Prisma.CrawlRunWhereInput {
  const scopeId = resolveScopeUserId(authUser, queryUserId);
  return scopeId ? { user_id: scopeId } : {};
}

export function diagnosticsUserWhere(
  authUser: AuthUser,
  queryUserId?: string,
): Prisma.DiagnosticsPackageWhereInput {
  const scopeId = resolveScopeUserId(authUser, queryUserId);
  if (!scopeId) {
    return {};
  }
  return { scraper: { user_id: scopeId } };
}

export function jobLogUserWhere(
  authUser: AuthUser,
  queryUserId?: string,
): Prisma.JobLogWhereInput {
  const scopeId = resolveScopeUserId(authUser, queryUserId);
  if (!scopeId) {
    return {};
  }
  return { crawl_run: { user_id: scopeId } };
}
