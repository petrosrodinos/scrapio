export const ApiRoutes = {
    dashboard: {
        root: "/dashboard",
    },
    health: {
        prefix: "/health",
    },
    auth: {
        email: {
            login: "/auth/email/login",
            register: "/auth/email/register",
            refresh_token: "/auth/email/refresh-token",
            admin_login_to_account: (account_uuid: string) => `/auth/email/${account_uuid}/admin-login`,
            forgot_password: "/auth/forgot-password",
            reset_password: "/auth/reset-password",
            verify_email: "/auth/verify-email",
            resend_verification_email: "/auth/resend-verification-email",
        },
    },
    users: {
        prefix: "/users",
        me: "/users/me",
        crawlScheduleTimezones: "/users/crawl-schedule-timezones",
    },
    google_maps: {
        timezone: "/google-maps/timezone",
    },
    admin: {
        websiteTargets: {
            prefix: "/admin/website-targets",
            list: "/admin/website-targets",
            detail: (id: string) => `/admin/website-targets/${id}`,
        },
        scrapers: {
            prefix: "/admin/scrapers",
            list: "/admin/scrapers",
            detail: (id: string) => `/admin/scrapers/${id}`,
            versions: (id: string) => `/admin/scrapers/${id}/versions`,
            activateVersion: (id: string, versionId: string) =>
                `/admin/scrapers/${id}/versions/${versionId}/activate`,
            runNow: (id: string) => `/admin/scrapers/${id}/run-now`,
            bulkDelete: "/admin/scrapers/bulk-delete",
        },
        generationRuns: {
            prefix: "/admin/generation-runs",
            list: "/admin/generation-runs",
            detail: (id: string) => `/admin/generation-runs/${id}`,
            approve: (id: string) => `/admin/generation-runs/${id}/approve`,
            reject: (id: string) => `/admin/generation-runs/${id}/reject`,
            cancel: (id: string) => `/admin/generation-runs/${id}/cancel`,
            retry: (id: string) => `/admin/generation-runs/${id}/retry`,
            start: (id: string) => `/admin/generation-runs/${id}/start`,
            delete: (id: string) => `/admin/generation-runs/${id}`,
        },
        crawlRuns: {
            prefix: "/admin/crawl-runs",
            list: "/admin/crawl-runs",
            detail: (id: string) => `/admin/crawl-runs/${id}`,
            rerun: (id: string) => `/admin/crawl-runs/${id}/rerun`,
            cancel: (id: string) => `/admin/crawl-runs/${id}/cancel`,
            bulkDelete: "/admin/crawl-runs/bulk-delete",
        },
        plainScrapeConfigs: {
            prefix: "/admin/plain-scrape-configs",
            list: "/admin/plain-scrape-configs",
            detail: (id: string) => `/admin/plain-scrape-configs/${id}`,
            runNow: (id: string) => `/admin/plain-scrape-configs/${id}/run-now`,
            bulkDelete: "/admin/plain-scrape-configs/bulk-delete",
        },
        browserAgentConfigs: {
            prefix: "/admin/browser-agent-configs",
            list: "/admin/browser-agent-configs",
            detail: (id: string) => `/admin/browser-agent-configs/${id}`,
            runNow: (id: string) => `/admin/browser-agent-configs/${id}/run-now`,
            bulkDelete: "/admin/browser-agent-configs/bulk-delete",
        },
        jobs: {
            prefix: "/admin/jobs",
            list: "/admin/jobs",
            detail: (id: string) => `/admin/jobs/${id}`,
            retry: (id: string) => `/admin/jobs/${id}/retry`,
            stop: (id: string) => `/admin/jobs/${id}/stop`,
            bulkDelete: "/admin/jobs/bulk-delete",
        },
        diagnostics: {
            prefix: "/admin/diagnostics",
            list: "/admin/diagnostics",
            detail: (id: string) => `/admin/diagnostics/${id}`,
        },
        platformConfig: {
            prefix: "/admin/platform-config",
            root: "/admin/platform-config",
        },
        queues: {
            bullBoard: "/admin/queues",
        },
        notifications: {
            list: "/admin/notifications",
            markAllRead: "/admin/notifications/read-all",
            bulkDelete: "/admin/notifications/bulk-delete",
            markRead: (id: string) => `/admin/notifications/${id}/read`,
            detail: (id: string) => `/admin/notifications/${id}`,
        },
        integrations: {
            list: "/admin/integrations",
            detail: (type: string) => `/admin/integrations/${type}`,
        },
        userIntegrations: {
            list: "/admin/user-integrations",
            detail: (id: string) => `/admin/user-integrations/${id}`,
        },
    },
};
