export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  api_key: string;
}

export interface CreateApiKeyPayload {
  name: string;
  expires_at?: string;
}

export interface UpdateApiKeyPayload {
  name?: string;
  is_active?: boolean;
}
