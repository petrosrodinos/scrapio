import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { Integration, IntegrationType } from "../interfaces/integrations.interfaces";

export const getIntegrations = async (): Promise<Integration[]> => {
  try {
    const response = await axiosInstance.get<Integration[]>(ApiRoutes.admin.integrations.list);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch integrations. Please try again.");
  }
};

export const getIntegration = async (type: IntegrationType): Promise<Integration> => {
  try {
    const response = await axiosInstance.get<Integration>(
      ApiRoutes.admin.integrations.detail(type),
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch integration. Please try again.");
  }
};
