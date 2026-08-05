import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  CrawlScheduleTimezone,
  UpdateUserProfilePayload,
  UserProfile,
} from "../interfaces/user-profile.interfaces";

export const getCurrentUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.get<UserProfile>(ApiRoutes.users.me);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch user profile. Please try again.");
  }
};

export const updateCurrentUserProfile = async (
  payload: UpdateUserProfilePayload,
): Promise<UserProfile> => {
  try {
    const response = await axiosInstance.patch<UserProfile>(ApiRoutes.users.me, payload);
    return response.data;
  } catch (error) {
    throw new Error("Failed to update user profile. Please try again.");
  }
};

export const getCrawlScheduleTimezones = async (): Promise<CrawlScheduleTimezone[]> => {
  try {
    const response = await axiosInstance.get<CrawlScheduleTimezone[]>(
      ApiRoutes.users.crawlScheduleTimezones,
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch crawl schedule timezones. Please try again.");
  }
};
