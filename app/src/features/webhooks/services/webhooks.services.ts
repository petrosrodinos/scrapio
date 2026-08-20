import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  CreateWebhookEndpointPayload,
  PaginatedResponse,
  UpdateWebhookEndpointPayload,
  WebhookDelivery,
  WebhookDeliveryListQuery,
  WebhookEndpoint,
  WebhookEventCatalogEntry,
  WebhookEventType,
} from "../interfaces/webhooks.interfaces";

export const getWebhookEventCatalog = async (): Promise<WebhookEventCatalogEntry[]> => {
  try {
    const response = await axiosInstance.get<WebhookEventCatalogEntry[]>(
      ApiRoutes.webhooks.eventCatalog,
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch webhook event catalog. Please try again.");
  }
};

export const getWebhookEndpoints = async (): Promise<WebhookEndpoint[]> => {
  try {
    const response = await axiosInstance.get<WebhookEndpoint[]>(ApiRoutes.webhooks.list);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch webhook endpoints. Please try again.");
  }
};

export const createWebhookEndpoint = async (
  payload: CreateWebhookEndpointPayload,
): Promise<WebhookEndpoint> => {
  try {
    const response = await axiosInstance.post<WebhookEndpoint>(ApiRoutes.webhooks.list, payload);
    return response.data;
  } catch (error) {
    throw new Error("Failed to create webhook endpoint. Please try again.");
  }
};

export const updateWebhookEndpoint = async (
  id: string,
  payload: UpdateWebhookEndpointPayload,
): Promise<WebhookEndpoint> => {
  try {
    const response = await axiosInstance.patch<WebhookEndpoint>(
      ApiRoutes.webhooks.detail(id),
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to update webhook endpoint. Please try again.");
  }
};

export const deleteWebhookEndpoint = async (id: string): Promise<void> => {
  try {
    await axiosInstance.delete(ApiRoutes.webhooks.detail(id));
  } catch (error) {
    throw new Error("Failed to delete webhook endpoint. Please try again.");
  }
};

export const getWebhookDeliveries = async (
  id: string,
  query?: WebhookDeliveryListQuery,
): Promise<PaginatedResponse<WebhookDelivery>> => {
  try {
    const response = await axiosInstance.get<PaginatedResponse<WebhookDelivery>>(
      ApiRoutes.webhooks.deliveries(id),
      { params: query },
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch webhook deliveries. Please try again.");
  }
};

export const resendWebhookDelivery = async (
  id: string,
  deliveryId: string,
): Promise<WebhookDelivery> => {
  try {
    const response = await axiosInstance.post<WebhookDelivery>(
      ApiRoutes.webhooks.resendDelivery(id, deliveryId),
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to resend webhook delivery. Please try again.");
  }
};

export const sendTestWebhookEvent = async (
  id: string,
  eventType: WebhookEventType,
): Promise<WebhookDelivery> => {
  try {
    const response = await axiosInstance.post<WebhookDelivery>(ApiRoutes.webhooks.test(id), {
      event_type: eventType,
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to send test event. Please try again.");
  }
};
