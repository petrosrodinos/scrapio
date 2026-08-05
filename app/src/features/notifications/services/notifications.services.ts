import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  DeleteNotificationsPayload,
  DeleteNotificationsResponse,
  MarkAllReadResponse,
  Notification,
  NotificationListQuery,
  PaginatedResponse,
} from "../interfaces/notifications.interfaces";

export const getNotifications = async (
  query?: NotificationListQuery,
): Promise<PaginatedResponse<Notification>> => {
  try {
    const response = await axiosInstance.get(ApiRoutes.admin.notifications.list, {
      params: query,
    });
    return response.data;
  } catch {
    throw new Error("Failed to fetch notifications. Please try again.");
  }
};

export const markNotificationRead = async (id: string): Promise<Notification> => {
  try {
    const response = await axiosInstance.patch(ApiRoutes.admin.notifications.markRead(id));
    return response.data;
  } catch {
    throw new Error("Failed to mark notification as read. Please try again.");
  }
};

export const markAllNotificationsRead = async (): Promise<MarkAllReadResponse> => {
  try {
    const response = await axiosInstance.patch(ApiRoutes.admin.notifications.markAllRead);
    return response.data;
  } catch {
    throw new Error("Failed to mark all notifications as read. Please try again.");
  }
};

export const deleteNotification = async (id: string): Promise<DeleteNotificationsResponse> => {
  try {
    const response = await axiosInstance.delete(ApiRoutes.admin.notifications.detail(id));
    return response.data;
  } catch {
    throw new Error("Failed to delete notification. Please try again.");
  }
};

export const deleteNotifications = async (
  payload: DeleteNotificationsPayload,
): Promise<DeleteNotificationsResponse> => {
  try {
    const response = await axiosInstance.post(
      ApiRoutes.admin.notifications.bulkDelete,
      payload,
    );
    return response.data;
  } catch {
    throw new Error("Failed to delete notifications. Please try again.");
  }
};
