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
        list: "/users",
        me: "/users/me",
        crawlScheduleTimezones: "/users/crawl-schedule-timezones",
    },
    google_maps: {
        timezone: "/google-maps/timezone",
    },
    websiteTargets: {
        prefix: "/website-targets",
        list: "/website-targets",
        detail: (id: string) => `/website-targets/${id}`,
    },
    scrapers: {
        prefix: "/scrapers",
        list: "/scrapers",
        detail: (id: string) => `/scrapers/${id}`,
        versions: (id: string) => `/scrapers/${id}/versions`,
        activateVersion: (id: string, versionId: string) =>
            `/scrapers/${id}/versions/${versionId}/activate`,
        runNow: (id: string) => `/scrapers/${id}/run-now`,
        bulkDelete: "/scrapers/bulk-delete",
    },
    generationRuns: {
        prefix: "/generation-runs",
        list: "/generation-runs",
        detail: (id: string) => `/generation-runs/${id}`,
        update: (id: string) => `/generation-runs/${id}`,
        approve: (id: string) => `/generation-runs/${id}/approve`,
        reject: (id: string) => `/generation-runs/${id}/reject`,
        cancel: (id: string) => `/generation-runs/${id}/cancel`,
        retry: (id: string) => `/generation-runs/${id}/retry`,
        start: (id: string) => `/generation-runs/${id}/start`,
        delete: (id: string) => `/generation-runs/${id}`,
    },
    crawlRuns: {
        prefix: "/crawl-runs",
        list: "/crawl-runs",
        detail: (id: string) => `/crawl-runs/${id}`,
        rerun: (id: string) => `/crawl-runs/${id}/rerun`,
        cancel: (id: string) => `/crawl-runs/${id}/cancel`,
        bulkDelete: "/crawl-runs/bulk-delete",
    },
    plainScrapeConfigs: {
        prefix: "/plain-scrape-configs",
        list: "/plain-scrape-configs",
        detail: (id: string) => `/plain-scrape-configs/${id}`,
        runNow: (id: string) => `/plain-scrape-configs/${id}/run-now`,
        bulkDelete: "/plain-scrape-configs/bulk-delete",
    },
    browserAgentConfigs: {
        prefix: "/browser-agent-configs",
        list: "/browser-agent-configs",
        detail: (id: string) => `/browser-agent-configs/${id}`,
        runNow: (id: string) => `/browser-agent-configs/${id}/run-now`,
        bulkDelete: "/browser-agent-configs/bulk-delete",
    },
    jobs: {
        prefix: "/jobs",
        list: "/jobs",
        detail: (id: string) => `/jobs/${id}`,
        retry: (id: string) => `/jobs/${id}/retry`,
        stop: (id: string) => `/jobs/${id}/stop`,
        bulkDelete: "/jobs/bulk-delete",
    },
    diagnostics: {
        prefix: "/diagnostics",
        list: "/diagnostics",
        detail: (id: string) => `/diagnostics/${id}`,
    },
    costs: {
        prefix: "/costs",
        summary: "/costs/summary",
        list: "/costs",
    },
    platformConfig: {
        prefix: "/platform-config",
        root: "/platform-config",
    },
    queues: {
        bullBoard: "/queues",
    },
    notifications: {
        list: "/notifications",
        markAllRead: "/notifications/read-all",
        bulkDelete: "/notifications/bulk-delete",
        markRead: (id: string) => `/notifications/${id}/read`,
        detail: (id: string) => `/notifications/${id}`,
    },
    integrations: {
        list: "/integrations",
        detail: (type: string) => `/integrations/${type}`,
    },
    userIntegrations: {
        list: "/user-integrations",
        detail: (id: string) => `/user-integrations/${id}`,
    },
    apiKeys: {
        list: "/api-keys",
        detail: (id: string) => `/api-keys/${id}`,
    },
    webhooks: {
        list: "/webhooks",
        detail: (id: string) => `/webhooks/${id}`,
        deliveries: (id: string) => `/webhooks/${id}/deliveries`,
        test: (id: string) => `/webhooks/${id}/test`,
        eventCatalog: "/webhooks/event-catalog",
    },
};
