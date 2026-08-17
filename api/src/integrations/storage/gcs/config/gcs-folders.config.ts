export const GcsFolders = {
  generationRunScreenshots: 'generation-screenshots',
  diagnostics: 'diagnostics',
  detailPageHtml: 'detail-page-html',
  openApiSpecs: 'openapi-specs',
} as const;
export type GcsFolder = (typeof GcsFolders)[keyof typeof GcsFolders];
