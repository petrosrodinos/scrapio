import { IntegrationType } from 'generated/prisma';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface UserIntegrationResponse {
  id: string;
  user_id: string;
  integration_type: IntegrationType;
  api_key_masked: string;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}
