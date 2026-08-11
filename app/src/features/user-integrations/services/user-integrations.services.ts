import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  ConnectUserIntegrationPayload,
  PaginatedUserIntegrations,
  UpdateUserIntegrationPayload,
  UserIntegration,
  UserIntegrationListQuery,
} from "../interfaces/user-integrations.interfaces";

export const getUserIntegrations = async (
  query?: UserIntegrationListQuery,
): Promise<PaginatedUserIntegrations> => {
  try {
    const response = await axiosInstance.get<PaginatedUserIntegrations>(
      ApiRoutes.userIntegrations.list,
      { params: query },
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch user integrations. Please try again.");
  }
};

export const connectUserIntegration = async (
  payload: ConnectUserIntegrationPayload,
): Promise<UserIntegration> => {
  try {
    const response = await axiosInstance.post<UserIntegration>(
      ApiRoutes.userIntegrations.list,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to connect integration. Please try again.");
  }
};

export const updateUserIntegration = async (
  id: string,
  payload: UpdateUserIntegrationPayload,
): Promise<UserIntegration> => {
  try {
    const response = await axiosInstance.patch<UserIntegration>(
      ApiRoutes.userIntegrations.detail(id),
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to update integration. Please try again.");
  }
};

export const disconnectUserIntegration = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.userIntegrations.detail(id));
  } catch (error) {
    throw new Error("Failed to disconnect integration. Please try again.");
  }
};
