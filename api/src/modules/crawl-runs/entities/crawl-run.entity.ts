import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ComputerActionType,
  DiagnosticsMode,
  ExtractionFormatStatus,
  ExtractionScope,
  OutputFormat,
  RunStatus,
  RunTrigger,
  WorkflowType,
} from 'generated/prisma';
import { JobLog } from '@/modules/jobs/entities/job-log.entity';

export class ExtractionResultEntity {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiPropertyOptional({
    nullable: true,
    enum: ExtractionFormatStatus,
    description: 'Present only when STRUCTURED_JSON is one of the run output formats',
  })
  structured_status?: ExtractionFormatStatus | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Validated structured output. Present only when STRUCTURED_JSON was requested.',
  })
  structured_data?: unknown | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Last raw model output, kept for debugging even on validation failure. Present only when STRUCTURED_JSON was requested.',
  })
  structured_raw_ai_output?: unknown | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Present only when STRUCTURED_JSON was requested.',
  })
  structured_validation_errors?: unknown | null;

  @ApiPropertyOptional({
    description: 'Present only when STRUCTURED_JSON was requested.',
  })
  structured_attempts?: number;

  @ApiPropertyOptional({
    nullable: true,
    enum: ExtractionFormatStatus,
    description: 'Present only when MARKDOWN is one of the run output formats',
  })
  markdown_status?: ExtractionFormatStatus | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Present only when MARKDOWN was requested.',
  })
  markdown?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Present only when MARKDOWN was requested.',
  })
  markdown_validation_errors?: unknown | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Self-contained HTML+CSS document rendering structured_data as a visual interface, if generated. Present only when STRUCTURED_JSON was requested.',
  })
  generated_ui_html?: string | null;

  @ApiProperty({ nullable: true, description: 'AI token/cost usage for this extraction' })
  ai_usage: unknown | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CrawlRunPage {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  workflow_run_id: string;

  @ApiProperty()
  requested_url: string;

  @ApiProperty({ nullable: true })
  final_url: string | null;

  @ApiProperty({ nullable: true })
  http_status: number | null;

  @ApiProperty()
  success: boolean;

  @ApiProperty({ nullable: true })
  raw_html: string | null;

  @ApiProperty({ nullable: true })
  cleaned_content: string | null;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty({ nullable: true })
  metadata: unknown | null;

  @ApiProperty({ nullable: true })
  error_message: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({
    nullable: true,
    description: 'Populated when the run\'s extraction_scope is PER_URL',
  })
  extraction_result: ExtractionResultEntity | null;
}

export class CrawlRunExecutionTrace {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  workflow_config_id: string;

  @ApiProperty({ nullable: true })
  workflow_run_id: string | null;

  @ApiProperty({ description: 'Ordered list of computer-use steps taken' })
  steps: unknown;

  @ApiProperty()
  success: boolean;

  @ApiProperty({ nullable: true })
  error_summary: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CrawlRunStep {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ nullable: true })
  scraper_generation_run_id: string | null;

  @ApiProperty({ nullable: true })
  workflow_run_id: string | null;

  @ApiProperty({ example: 0 })
  step_index: number;

  @ApiProperty({ enum: ComputerActionType, example: ComputerActionType.CLICK })
  action_type: ComputerActionType;

  @ApiProperty({
    description: 'Raw action returned by the model',
    example: { x: 320, y: 540 },
  })
  action_payload: Record<string, unknown>;

  @ApiProperty({
    nullable: true,
    description: 'Resolved GCS url of the screenshot taken before this action',
  })
  screenshot_before_url: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Resolved GCS url of the screenshot taken after this action',
  })
  screenshot_after_url: string | null;

  @ApiProperty({ nullable: true })
  model_reasoning: string | null;

  @ApiProperty()
  created_at: Date;
}

export class CrawlRunDiagnosticsPackageSummary {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ enum: DiagnosticsMode, example: DiagnosticsMode.FULL_DEBUG })
  mode: DiagnosticsMode;
}

export class WorkflowRun {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: WorkflowType })
  type: WorkflowType;

  @ApiProperty()
  workflow_config_id: string;

  @ApiProperty({ enum: RunTrigger, example: RunTrigger.MANUAL })
  trigger: RunTrigger;

  @ApiProperty({ nullable: true })
  website_target_id: string | null;

  @ApiProperty({ nullable: true })
  scraper_version_id: string | null;

  @ApiProperty({ nullable: true, description: 'BROWSER_AGENT run target URL' })
  url: string | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run step cap',
    example: 25,
  })
  max_steps: number | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run: URLs visited so far',
  })
  visited_urls: unknown | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run: computer-use actions taken',
  })
  browser_actions: unknown | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run: raw data collected during the run',
  })
  collected_data: unknown | null;

  @ApiProperty({
    description:
      "Snapshotted from the config's capture_api at enqueue time. When true, captured_requests " +
      'holds every recorded HTTP request/response and an OpenAPI spec is distilled from them on completion.',
  })
  capture_api: boolean;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run: recorded HTTP requests/responses, present only when capture_api is true',
  })
  captured_requests: unknown | null;

  @ApiProperty({
    nullable: true,
    description: 'Id of the generated OpenAPI spec Document, present only when capture_api is true',
  })
  openapi_spec_document_id: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Signed, time-limited URL to download the generated OpenAPI spec. Present only on the get-one response, when capture_api is true.',
  })
  openapi_spec_url?: string | null;

  @ApiProperty({
    type: [String],
    description: 'PLAIN_SCRAPE run: URLs to scrape',
  })
  urls: string[];

  @ApiProperty({
    enum: ExtractionScope,
    nullable: true,
    example: ExtractionScope.COMBINED,
    description: 'PLAIN_SCRAPE run: how multiple URLs are normalized',
  })
  extraction_scope: ExtractionScope | null;

  @ApiProperty({
    enum: OutputFormat,
    isArray: true,
    description:
      "Snapshot of the config's output contract (BROWSER_AGENT + PLAIN_SCRAPE)",
    example: [OutputFormat.STRUCTURED_JSON],
  })
  output_formats: OutputFormat[];

  @ApiProperty({ nullable: true })
  extraction_schema_version_id: string | null;

  @ApiProperty({ nullable: true, description: 'AI token/cost usage for this run' })
  ai_usage: unknown | null;

  @ApiProperty({ nullable: true, description: 'Free-form run metadata' })
  metadata: unknown | null;

  @ApiProperty({ enum: RunStatus, example: RunStatus.QUEUED })
  status: RunStatus;

  @ApiProperty({ nullable: true })
  error_message: string | null;

  @ApiProperty({ nullable: true })
  started_at: Date | null;

  @ApiProperty({ nullable: true })
  finished_at: Date | null;

  @ApiProperty({ nullable: true })
  duration_ms: number | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({
    required: false,
    description: 'Present on list/detail views',
    example: { name: 'Acme Real Estate' },
  })
  website_target?: { name: string } | null;

  @ApiProperty({
    required: false,
    description: 'Present on list/detail views',
    example: { name: 'Acme listing scraper' },
  })
  workflow_config?: { name: string };

  @ApiPropertyOptional({
    nullable: true,
    description:
      'SCRAPER/BROWSER_AGENT run result. Present only on the get-one response.',
  })
  extraction_result?: ExtractionResultEntity | null;

  @ApiPropertyOptional({
    type: [CrawlRunPage],
    description:
      'PLAIN_SCRAPE run: one entry per scraped URL. Present only on the get-one response.',
  })
  pages?: CrawlRunPage[];

  @ApiPropertyOptional({
    type: [CrawlRunExecutionTrace],
    description: 'SCRAPER run: execution traces. Present only on the get-one response.',
  })
  execution_traces?: CrawlRunExecutionTrace[];

  @ApiPropertyOptional({
    type: [JobLog],
    description: 'Present only on the get-one response.',
  })
  job_logs?: JobLog[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Present only on the get-one response.',
  })
  diagnostics_package?: CrawlRunDiagnosticsPackageSummary | null;

  @ApiPropertyOptional({
    type: [CrawlRunStep],
    description:
      'BROWSER_AGENT/SCRAPER run: computer-use steps taken. Present only on the get-one response.',
  })
  steps?: CrawlRunStep[];
}

export { WorkflowRun as CrawlRun };
