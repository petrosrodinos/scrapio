import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { CrawlRun } from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";
import type {
  CreateScraperPayload,
  CreateScraperVersionPayload,
  DeleteScrapersPayload,
  PaginatedResponse,
  Scraper,
  ScraperListQuery,
  ScraperVersion,
  UpdateScraperPayload,
} from "../interfaces/scrapers.interfaces";

export const getScrapers = async (
  query?: ScraperListQuery,
): Promise<PaginatedResponse<Scraper>> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.scrapers.list, { params: query });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch scrapers. Please try again.");
  }
};

export const getScraper = async (id: string): Promise<Scraper> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.scrapers.detail(id));
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch scraper. Please try again.");
  }
};

export const createScraper = async (payload: CreateScraperPayload): Promise<Scraper> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.scrapers.list, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to create scraper. Please try again.");
  }
};

export const getScraperVersions = async (id: string): Promise<ScraperVersion[]> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.scrapers.versions(id));
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch scraper versions. Please try again.");
  }
};

export const createScraperVersion = async (
  id: string,
  payload: CreateScraperVersionPayload,
): Promise<ScraperVersion> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.scrapers.versions(id), payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to create scraper version. Please try again.",
    );
  }
};

export const activateScraperVersion = async (
  id: string,
  versionId: string,
): Promise<Scraper> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.scrapers.activateVersion(id, versionId));
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to activate scraper version. Please try again.",
    );
  }
};

export const updateScraper = async (
  id: string,
  payload: UpdateScraperPayload,
): Promise<Scraper> => {
  try {
    const response = await axiosInstance.patch(ApiRoutes.scrapers.detail(id), payload);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to update scraper. Please try again.");
  }
};

export const runScraperNow = async (id: string): Promise<CrawlRun> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.scrapers.runNow(id));
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to run scraper. Please try again.");
  }
};

export const deleteScraper = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.scrapers.detail(id));
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to delete scraper. Please try again.");
  }
};

export const deleteScrapers = async (
  payload: DeleteScrapersPayload,
): Promise<{ deleted: number }> => {
  try {
    const response = await axiosInstance.post(ApiRoutes.scrapers.bulkDelete, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to delete scrapers. Please try again.");
  }
};
