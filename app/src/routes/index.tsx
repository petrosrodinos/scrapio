import { Routes as ReactRoutes, Route, Navigate } from "react-router-dom";
import { Routes } from "@/routes/routes";
import ProtectedRoute from "@/routes/protected-route";
import AdminOnlyRoute from "@/routes/admin-only-route";
import SignIn from "@/pages/auth/pages/sign-in";
import SignUp from "@/pages/auth/pages/sign-up";
import ForgotPassword from "@/pages/auth/pages/forgot-password";
import ResetPassword from "@/pages/auth/pages/reset-password";
import AuthLayout from "@/pages/auth/layout";
import DashboardLayout from "@/pages/dashboard/layout";
import DashboardHome from "@/pages/dashboard";
import AdminHealthPage from "@/pages/admin/pages/health";
import WebsiteTargetsListPage from "@/pages/admin/website-targets";
import WebsiteTargetDetailPage from "@/pages/admin/website-targets/detail";
import ScraperDetailPage from "@/pages/admin/scrapers/detail";
import NewWorkflowPage from "@/pages/admin/workflows/new";
import PlainScrapeListPage from "@/pages/admin/plain-scrape";
import PlainScrapeDetailPage from "@/pages/admin/plain-scrape/detail";
import BrowserAgentListPage from "@/pages/admin/browser-agent";
import BrowserAgentDetailPage from "@/pages/admin/browser-agent/detail";
import GenerationRunsListPage from "@/pages/admin/generation-runs";
import GenerationRunDetailPage from "@/pages/admin/generation-runs/detail";
import CrawlRunsListPage from "@/pages/admin/crawl-runs";
import CrawlRunDetailPage from "@/pages/admin/crawl-runs/detail";
import AdminJobsListPage from "@/pages/admin/jobs";
import AdminJobDetailPage from "@/pages/admin/jobs/detail";
import UserJobsListPage from "@/pages/jobs";
import UserJobDetailPage from "@/pages/jobs/detail";
import AdminDiagnosticsListPage from "@/pages/admin/diagnostics";
import AdminDiagnosticsDetailPage from "@/pages/admin/diagnostics/detail";
import UserDiagnosticsListPage from "@/pages/diagnostics";
import UserDiagnosticsDetailPage from "@/pages/diagnostics/detail";
import CrawlerConfigPage from "@/pages/admin/crawler-config";
import NotificationsListPage from "@/pages/admin/notifications";
import IntegrationsPage from "@/pages/integrations";
import ApiKeysPage from "@/pages/api-keys";
import WebhooksPage from "@/pages/webhooks";

export default function AppRoutes() {
  return (
    <ReactRoutes>
      <Route
        path="/auth"
        element={
          <ProtectedRoute loggedIn={false}>
            <AuthLayout />
          </ProtectedRoute>
        }
      >
        <Route path="sign-up" element={<SignUp />} />
        <Route path="sign-in" element={<SignIn />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route index element={<Navigate to={Routes.auth.sign_in} replace />} />
      </Route>

      <Route
        element={
          <ProtectedRoute loggedIn={true}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path={Routes.dashboard.root} element={<DashboardHome />} />
        <Route path={Routes.websiteTargets.list} element={<WebsiteTargetsListPage />} />
        <Route path={`${Routes.websiteTargets.list}/:id`} element={<WebsiteTargetDetailPage />} />
        <Route path="/scrapers" element={<Navigate to={Routes.websiteTargets.list} replace />} />
        <Route path="/scrapers/:id" element={<ScraperDetailPage />} />
        <Route path={Routes.workflows.new} element={<NewWorkflowPage />} />
        <Route path={Routes.plainScrape.list} element={<PlainScrapeListPage />} />
        <Route path={`${Routes.plainScrape.list}/:id`} element={<PlainScrapeDetailPage />} />
        <Route path={Routes.browserAgent.list} element={<BrowserAgentListPage />} />
        <Route path={`${Routes.browserAgent.list}/:id`} element={<BrowserAgentDetailPage />} />
        <Route path={Routes.generationRuns.list} element={<GenerationRunsListPage />} />
        <Route path={`${Routes.generationRuns.list}/:id`} element={<GenerationRunDetailPage />} />
        <Route path={Routes.crawlRuns.list} element={<CrawlRunsListPage />} />
        <Route path={`${Routes.crawlRuns.list}/:id`} element={<CrawlRunDetailPage />} />
        <Route path={Routes.jobs.list} element={<UserJobsListPage />} />
        <Route path={`${Routes.jobs.list}/:id`} element={<UserJobDetailPage />} />
        <Route path={Routes.diagnostics.list} element={<UserDiagnosticsListPage />} />
        <Route path={`${Routes.diagnostics.list}/:id`} element={<UserDiagnosticsDetailPage />} />
        <Route path={Routes.integrations.list} element={<IntegrationsPage />} />
        <Route path={Routes.apiKeys.list} element={<ApiKeysPage />} />
        <Route path={Routes.webhooks.list} element={<WebhooksPage />} />
        <Route element={<AdminOnlyRoute />}>
          <Route path={Routes.admin.diagnostics.list} element={<AdminDiagnosticsListPage />} />
          <Route path={`${Routes.admin.diagnostics.list}/:id`} element={<AdminDiagnosticsDetailPage />} />
          <Route path={Routes.admin.jobs.list} element={<AdminJobsListPage />} />
          <Route path={`${Routes.admin.jobs.list}/:id`} element={<AdminJobDetailPage />} />
          <Route path={Routes.admin.crawlerConfig} element={<CrawlerConfigPage />} />
          <Route path={Routes.admin.notifications} element={<NotificationsListPage />} />
          <Route path={Routes.admin.health} element={<AdminHealthPage />} />
        </Route>
      </Route>

      <Route path="/admin" element={<Navigate to={Routes.admin.jobs.list} replace />} />
      <Route path="/admin/*" element={<Navigate to={Routes.admin.jobs.list} replace />} />

      <Route path="/" element={<Navigate to={Routes.auth.sign_in} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </ReactRoutes>
  );
}
