import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type { UserSummary } from "../interfaces/users.interfaces";

export const getUsers = async (): Promise<UserSummary[]> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.users.list);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch users. Please try again.");
  }
};
