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
        detail: (
            id: string,
            options?: { tab?: "target" | "scrapers"; createScraper?: boolean },
        ) => {
            const params = new URLSearchParams();
            if (options?.tab === "scrapers") params.set("tab", "scrapers");
            if (options?.createScraper) params.set("createScraper", "1");
            const qs = params.toString();
            return `/website-targets/${id}${qs ? `?${qs}` : ""}`;
        },
    },
    scrapers: {
        detail: (id: string) => `/scrapers/${id}`,
    },
    workflows: {
        new: "/workflows/new",
    },
    plainScrape: {
        list: "/plain-scrape",
        detail: (id: string) => `/plain-scrape/${id}`,
    },
    browserAgent: {
        list: "/browser-agent",
        detail: (id: string) => `/browser-agent/${id}`,
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
    integrations: {
        list: "/integrations",
    },
    apiKeys: {
        list: "/api-keys",
    },
    admin: {
        jobs: {
            list: "/jobs",
            detail: (id: string) => `/jobs/${id}`,
        },
        crawlerConfig: "/crawler-config",
        notifications: "/notifications",
        health: "/health",
    },
};
