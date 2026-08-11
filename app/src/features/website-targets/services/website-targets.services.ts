import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  CreateWebsiteTargetPayload,
  PaginatedResponse,
  UpdateWebsiteTargetPayload,
  WebsiteTarget,
  WebsiteTargetListQuery,
} from "../interfaces/website-targets.interfaces";

export const getWebsiteTargets = async (
  query?: WebsiteTargetListQuery,
): Promise<PaginatedResponse<WebsiteTarget>> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.websiteTargets.list, {
      params: query,
    });
    return response.data;
  } catch {
    throw new Error("Failed to fetch website targets. Please try again.");
  }
};

export const getWebsiteTarget = async (id: string): Promise<WebsiteTarget> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.websiteTargets.detail(id));
    return response.data;
  } catch {
    throw new Error("Failed to fetch website target. Please try again.");
  }
};

export const createWebsiteTarget = async (
  payload: CreateWebsiteTargetPayload,
): Promise<WebsiteTarget> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.websiteTargets.list, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to create website target. Please try again.",
    );
  }
};

export const updateWebsiteTarget = async (
  id: string,
  payload: UpdateWebsiteTargetPayload,
): Promise<WebsiteTarget> => {
  try {
    const response = await axiosInstance.patch(
      ApiRoutes.websiteTargets.detail(id),
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to update website target. Please try again.",
    );
  }
};

export const deleteWebsiteTarget = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.websiteTargets.detail(id));
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to delete website target. Please try again.",
    );
  }
};
