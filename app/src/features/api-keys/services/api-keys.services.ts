import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  ApiKey,
  ApiKeyCreated,
  CreateApiKeyPayload,
  UpdateApiKeyPayload,
} from "../interfaces/api-keys.interfaces";

export const getApiKeys = async (): Promise<ApiKey[]> => {
  try {
    const response = await axiosInstance.get<ApiKey[]>(ApiRoutes.apiKeys.list);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch API keys. Please try again.");
  }
};

export const createApiKey = async (payload: CreateApiKeyPayload): Promise<ApiKeyCreated> => {
  try {
    const response = await axiosInstance.post<ApiKeyCreated>(ApiRoutes.apiKeys.list, payload);
    return response.data;
  } catch (error) {
    throw new Error("Failed to create API key. Please try again.");
  }
};

export const updateApiKey = async (id: string, payload: UpdateApiKeyPayload): Promise<ApiKey> => {
  try {
    const response = await axiosInstance.patch<ApiKey>(ApiRoutes.apiKeys.detail(id), payload);
    return response.data;
  } catch (error) {
    throw new Error("Failed to update API key. Please try again.");
  }
};

export const revokeApiKey = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.apiKeys.detail(id));
  } catch (error) {
    throw new Error("Failed to revoke API key. Please try again.");
  }
};
