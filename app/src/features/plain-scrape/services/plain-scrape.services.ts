import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  CreatePlainScrapeConfigPayload,
  PaginatedResponse,
  PlainScrapeConfig,
  PlainScrapeConfigListQuery,
  UpdatePlainScrapeConfigPayload,
} from "../interfaces/plain-scrape.interfaces";

export const getPlainScrapeConfigs = async (
  query?: PlainScrapeConfigListQuery,
): Promise<PaginatedResponse<PlainScrapeConfig>> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.admin.plainScrapeConfigs.list, {
      params: query,
    });
    return response.data;
  } catch {
    throw new Error("Failed to fetch plain scrape configs. Please try again.");
  }
};

export const getPlainScrapeConfig = async (id: string): Promise<PlainScrapeConfig> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.admin.plainScrapeConfigs.detail(id));
    return response.data;
  } catch {
    throw new Error("Failed to fetch plain scrape config. Please try again.");
  }
};

export const createPlainScrapeConfig = async (
  payload: CreatePlainScrapeConfigPayload,
): Promise<PlainScrapeConfig> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.admin.plainScrapeConfigs.list, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to create plain scrape config. Please try again.",
    );
  }
};

export const updatePlainScrapeConfig = async (
  id: string,
  payload: UpdatePlainScrapeConfigPayload,
): Promise<PlainScrapeConfig> => {
  try {
    const response = await axiosInstance.patch(
      ApiRoutes.admin.plainScrapeConfigs.detail(id),
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to update plain scrape config. Please try again.",
    );
  }
};

export const deletePlainScrapeConfig = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.admin.plainScrapeConfigs.detail(id));
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to delete plain scrape config. Please try again.",
    );
  }
};

export const bulkDeletePlainScrapeConfigs = async (ids: string[]): Promise<void> => {
  try {
    await axiosInstance.post(ApiRoutes.admin.plainScrapeConfigs.bulkDelete, {
      workflow_config_ids: ids,
    });
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to delete plain scrape configs. Please try again.",
    );
  }
};

export const runPlainScrapeConfigNow = async (id: string): Promise<void> => {
  try {
    await axiosInstance.post(ApiRoutes.admin.plainScrapeConfigs.runNow(id));
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to start plain scrape run. Please try again.",
    );
  }
};
