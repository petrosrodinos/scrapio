import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  CrawlRun,
  CrawlRunDetail,
  CrawlRunListQuery,
  CrawlRunListResponse,
  DeleteCrawlRunsPayload,
  ExtractionResult,
  GenerateUiPayload,
} from "../interfaces/crawl-runs.interfaces";

export const getCrawlRuns = async (
  query?: CrawlRunListQuery,
): Promise<CrawlRunListResponse> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.crawlRuns.list, { params: query });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch crawl runs. Please try again.");
  }
};

export const getCrawlRun = async (id: string): Promise<CrawlRunDetail> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.crawlRuns.detail(id));
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch crawl run. Please try again.");
  }
};

export const rerunCrawlRun = async (id: string): Promise<CrawlRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.crawlRuns.rerun(id));
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to rerun crawl. Please try again.");
  }
};

export const cancelCrawlRun = async (id: string): Promise<CrawlRunDetail> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.crawlRuns.cancel(id));
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to stop crawl. Please try again.",
    );
  }
};

export const generateCrawlRunUi = async (
  id: string,
  payload?: GenerateUiPayload,
): Promise<ExtractionResult> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.crawlRuns.generateUi(id), payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to generate interface. Please try again.",
    );
  }
};

export const generateCrawlRunPageUi = async (
  id: string,
  pageId: string,
  payload?: GenerateUiPayload,
): Promise<ExtractionResult> => {
  try {
    const response = await axiosInstance.post(
      ApiRoutes.crawlRuns.generateUiPage(id, pageId),
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to generate interface. Please try again.",
    );
  }
};

export const deleteCrawlRun = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.crawlRuns.detail(id));
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to delete crawl run. Please try again.",
    );
  }
};

export const deleteCrawlRuns = async (
  payload: DeleteCrawlRunsPayload,
): Promise<{ deleted: number }> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.crawlRuns.bulkDelete, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to delete crawl runs. Please try again.",
    );
  }
};
