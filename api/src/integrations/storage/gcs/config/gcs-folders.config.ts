export const GcsFolders = {
    generationRunScreenshots: 'generation-screenshots',
    diagnostics: 'diagnostics',
    detailPageHtml: 'detail-page-html',
} as const;
export type GcsFolder = (typeof GcsFolders)[keyof typeof GcsFolders];
