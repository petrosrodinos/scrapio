import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  CostEntry,
  CostQuery,
  CostSummary,
  PaginatedResponse,
} from "../interfaces/costs.interfaces";

export const getCostSummary = async (query?: CostQuery): Promise<CostSummary> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.costs.summary, {
      params: query,
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch cost summary. Please try again.");
  }
};

export const getCostEntries = async (
  query?: CostQuery,
): Promise<PaginatedResponse<CostEntry>> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.costs.list, {
      params: query,
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch cost entries. Please try again.");
  }
};
