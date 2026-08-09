import type {
  ComputerUseModel,
  IntegrationType,
} from "@/features/integrations/interfaces/integrations.interfaces";

export interface UserIntegration {
  id: string;
  user_id: string;
  integration_type: IntegrationType;
  computer_use_model: ComputerUseModel | null;
  ai_model: ComputerUseModel | null;
  api_key_masked: string;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedUserIntegrations {
  data: UserIntegration[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface UserIntegrationListQuery {
  page?: number;
  limit?: number;
  integration_type?: IntegrationType;
  is_active?: boolean;
}

export interface ConnectUserIntegrationPayload {
  integration_type: IntegrationType;
  api_key: string;
  computer_use_model?: ComputerUseModel;
  ai_model?: ComputerUseModel;
  metadata?: Record<string, unknown>;
}

export interface UpdateUserIntegrationPayload {
  api_key?: string;
  computer_use_model?: ComputerUseModel;
  ai_model?: ComputerUseModel;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}
