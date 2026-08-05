export const Routes = {
    auth: {
        sign_in: "/auth/sign-in",
        sign_up: "/auth/sign-up",
        forgot_password: "/auth/forgot-password",
        reset_password: "/auth/reset-password",
    },
    dashboard: {
        root: "/dashboard",
    },
    websiteTargets: {
        list: "/website-targets",
        detail: (id: string) => `/website-targets/${id}`,
    },
    scrapers: {
        list: "/scrapers",
        detail: (id: string) => `/scrapers/${id}`,
    },
    generationRuns: {
        list: "/generation-runs",
        detail: (id: string) => `/generation-runs/${id}`,
    },
    crawlRuns: {
        list: "/crawl-runs",
        detail: (id: string) => `/crawl-runs/${id}`,
    },
    diagnostics: {
        list: "/diagnostics",
        detail: (id: string) => `/diagnostics/${id}`,
    },
    admin: {
        jobs: {
            list: "/admin/jobs",
            detail: (id: string) => `/admin/jobs/${id}`,
        },
        crawlerConfig: "/admin/crawler-config",
        notifications: "/admin/notifications",
        health: "/admin/health",
    },
};
