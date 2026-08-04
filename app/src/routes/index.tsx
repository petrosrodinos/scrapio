import { Routes as ReactRoutes, Route, Navigate } from "react-router-dom";
import { Routes } from "@/routes/routes";
import ProtectedRoute from "@/routes/protected-route";
import SignIn from "@/pages/auth/pages/sign-in";
import SignUp from "@/pages/auth/pages/sign-up";
import ForgotPassword from "@/pages/auth/pages/forgot-password";
import ResetPassword from "@/pages/auth/pages/reset-password";
import AuthLayout from "@/pages/auth/layout";
import DashboardLayout from "@/pages/dashboard/layout";
import DashboardHome from "@/pages/dashboard";
import AdminLayout from "@/pages/admin/layout";
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
import { RoleTypes } from "@/features/user/interfaces/user.interface";

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
        path="/dashboard/*"
        element={
          <ProtectedRoute loggedIn={true}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute loggedIn={true} requiredRoles={[RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN, RoleTypes.SUPPORT]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="health" element={<AdminHealthPage />} />
        <Route path="website-targets" element={<WebsiteTargetsListPage />} />
        <Route path="website-targets/:id" element={<WebsiteTargetDetailPage />} />
        <Route path="scrapers" element={<ScrapersListPage />} />
        <Route path="scrapers/:id" element={<ScraperDetailPage />} />
        <Route path="generation-runs" element={<GenerationRunsListPage />} />
        <Route path="generation-runs/:id" element={<GenerationRunDetailPage />} />
        <Route path="crawl-runs" element={<CrawlRunsListPage />} />
        <Route path="crawl-runs/:id" element={<CrawlRunDetailPage />} />
        <Route path="jobs" element={<JobsListPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="diagnostics" element={<DiagnosticsListPage />} />
        <Route path="diagnostics/:id" element={<DiagnosticsDetailPage />} />
        <Route path="crawler-config" element={<CrawlerConfigPage />} />
        <Route index element={<Navigate to={Routes.admin.scrapers.list} replace />} />
      </Route>

      <Route path="/" element={<Navigate to={Routes.auth.sign_in} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </ReactRoutes>
  );
}
