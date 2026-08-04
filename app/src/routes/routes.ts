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
    admin: {
        health: "/admin/health",
        websiteTargets: {
            list: "/admin/website-targets",
            detail: (id: string) => `/admin/website-targets/${id}`,
        },
        scrapers: {
            list: "/admin/scrapers",
            detail: (id: string) => `/admin/scrapers/${id}`,
        },
        generationRuns: {
            list: "/admin/generation-runs",
            detail: (id: string) => `/admin/generation-runs/${id}`,
        },
        crawlRuns: {
            list: "/admin/crawl-runs",
            detail: (id: string) => `/admin/crawl-runs/${id}`,
        },
        jobs: {
            list: "/admin/jobs",
            detail: (id: string) => `/admin/jobs/${id}`,
        },
        diagnostics: {
            list: "/admin/diagnostics",
            detail: (id: string) => `/admin/diagnostics/${id}`,
        },
        crawlerConfig: "/admin/crawler-config",
    },
};
