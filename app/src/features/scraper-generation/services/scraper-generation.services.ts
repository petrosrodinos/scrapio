import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  CreateGenerationRunPayload,
  GenerationRun,
  GenerationRunListQuery,
  PaginatedResponse,
  RejectGenerationRunPayload,
  RetryGenerationRunPayload,
  UpdateGenerationRunPayload,
} from "../interfaces/scraper-generation.interfaces";

export const getGenerationRuns = async (
  query?: GenerationRunListQuery,
): Promise<PaginatedResponse<GenerationRun>> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.generationRuns.list, {
      params: query,
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch generation runs. Please try again.");
  }
};

export const getGenerationRun = async (id: string): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.generationRuns.detail(id));
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch generation run. Please try again.");
  }
};

export const createGenerationRun = async (
  payload: CreateGenerationRunPayload,
): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.generationRuns.list, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to create generation run. Please try again.",
    );
  }
};

export const updateGenerationRun = async (
  id: string,
  payload: UpdateGenerationRunPayload,
): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.patch(
      ApiRoutes.generationRuns.update(id),
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to update generation run. Please try again.",
    );
  }
};

export const startGenerationRun = async (id: string): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.generationRuns.start(id));
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to start generation run. Please try again.",
    );
  }
};

export const approveGenerationRun = async (id: string): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.generationRuns.approve(id));
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to approve generation run. Please try again.",
    );
  }
};

export const rejectGenerationRun = async (
  id: string,
  payload?: RejectGenerationRunPayload,
): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.generationRuns.reject(id), payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to reject generation run. Please try again.",
    );
  }
};

export const cancelGenerationRun = async (id: string): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.generationRuns.cancel(id));
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to cancel generation run. Please try again.",
    );
  }
};

export const retryGenerationRun = async (
  id: string,
  payload?: RetryGenerationRunPayload,
): Promise<GenerationRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.generationRuns.retry(id), payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to retry generation run. Please try again.",
    );
  }
};

export const deleteGenerationRun = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.generationRuns.delete(id));
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to delete generation run. Please try again.",
    );
  }
};
