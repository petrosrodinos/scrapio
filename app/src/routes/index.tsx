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
import ScrapersListPage from "@/pages/admin/scrapers";
import ScraperDetailPage from "@/pages/admin/scrapers/detail";
import GenerationRunsListPage from "@/pages/admin/generation-runs";
import GenerationRunDetailPage from "@/pages/admin/generation-runs/detail";
import CrawlRunsListPage from "@/pages/admin/crawl-runs";
import CrawlRunDetailPage from "@/pages/admin/crawl-runs/detail";
import JobsListPage from "@/pages/admin/jobs";
import JobDetailPage from "@/pages/admin/jobs/detail";
import DiagnosticsListPage from "@/pages/admin/diagnostics";
import DiagnosticsDetailPage from "@/pages/admin/diagnostics/detail";
import CrawlerConfigPage from "@/pages/admin/crawler-config";
import NotificationsListPage from "@/pages/admin/notifications";
import IntegrationsPage from "@/pages/integrations";

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
        <Route path={Routes.scrapers.list} element={<ScrapersListPage />} />
        <Route path={`${Routes.scrapers.list}/:id`} element={<ScraperDetailPage />} />
        <Route path={Routes.generationRuns.list} element={<GenerationRunsListPage />} />
        <Route path={`${Routes.generationRuns.list}/:id`} element={<GenerationRunDetailPage />} />
        <Route path={Routes.crawlRuns.list} element={<CrawlRunsListPage />} />
        <Route path={`${Routes.crawlRuns.list}/:id`} element={<CrawlRunDetailPage />} />
        <Route path={Routes.diagnostics.list} element={<DiagnosticsListPage />} />
        <Route path={`${Routes.diagnostics.list}/:id`} element={<DiagnosticsDetailPage />} />
        <Route path={Routes.integrations.list} element={<IntegrationsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute loggedIn={true}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route element={<AdminOnlyRoute />}>
          <Route path="jobs" element={<JobsListPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="crawler-config" element={<CrawlerConfigPage />} />
          <Route path="notifications" element={<NotificationsListPage />} />
          <Route path="health" element={<AdminHealthPage />} />
        </Route>
        <Route index element={<Navigate to={Routes.admin.jobs.list} replace />} />
      </Route>

      <Route path="/" element={<Navigate to={Routes.auth.sign_in} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </ReactRoutes>
  );
}
