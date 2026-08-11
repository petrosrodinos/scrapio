import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  BrowserAgentConfig,
  BrowserAgentConfigListQuery,
  CreateBrowserAgentConfigPayload,
  PaginatedResponse,
  UpdateBrowserAgentConfigPayload,
} from "../interfaces/browser-agent.interfaces";
import type { CrawlRun } from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";

export const getBrowserAgentConfigs = async (
  query?: BrowserAgentConfigListQuery,
): Promise<PaginatedResponse<BrowserAgentConfig>> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.browserAgentConfigs.list, {
      params: query,
    });
    return response.data;
  } catch {
    throw new Error("Failed to fetch browser agent configs. Please try again.");
  }
};

export const getBrowserAgentConfig = async (id: string): Promise<BrowserAgentConfig> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.browserAgentConfigs.detail(id));
    return response.data;
  } catch {
    throw new Error("Failed to fetch browser agent config. Please try again.");
  }
};

export const createBrowserAgentConfig = async (
  payload: CreateBrowserAgentConfigPayload,
): Promise<BrowserAgentConfig> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.browserAgentConfigs.list, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to create browser agent config. Please try again.",
    );
  }
};

export const updateBrowserAgentConfig = async (
  id: string,
  payload: UpdateBrowserAgentConfigPayload,
): Promise<BrowserAgentConfig> => {
  try {
    const response = await axiosInstance.patch(
      ApiRoutes.browserAgentConfigs.detail(id),
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to update browser agent config. Please try again.",
    );
  }
};

export const deleteBrowserAgentConfig = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.browserAgentConfigs.detail(id));
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to delete browser agent config. Please try again.",
    );
  }
};

export const bulkDeleteBrowserAgentConfigs = async (ids: string[]): Promise<void> => {
  try {
    await axiosInstance.post(ApiRoutes.browserAgentConfigs.bulkDelete, {
      workflow_config_ids: ids,
    });
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
        "Failed to delete browser agent configs. Please try again.",
    );
  }
};

export const runBrowserAgentConfigNow = async (id: string): Promise<CrawlRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.browserAgentConfigs.runNow(id));
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to start browser agent run. Please try again.",
    );
  }
};
