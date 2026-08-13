import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookDeliveries,
  getWebhookEndpoints,
  getWebhookEventCatalog,
  sendTestWebhookEvent,
  updateWebhookEndpoint,
} from "../services/webhooks.services";
import type {
  CreateWebhookEndpointPayload,
  UpdateWebhookEndpointPayload,
  WebhookDeliveryListQuery,
  WebhookEventType,
} from "../interfaces/webhooks.interfaces";

export const useWebhookEventCatalog = () => {
  return useQuery({
    queryKey: ["webhooks", "event-catalog"],
    queryFn: getWebhookEventCatalog,
    staleTime: Infinity,
  });
};

export const useWebhookEndpoints = () => {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: getWebhookEndpoints,
  });
};

export const useCreateWebhookEndpoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWebhookEndpointPayload) => createWebhookEndpoint(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({ title: "Webhook endpoint created", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create webhook endpoint",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useUpdateWebhookEndpoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWebhookEndpointPayload }) =>
      updateWebhookEndpoint(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({ title: "Webhook endpoint updated", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update webhook endpoint",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useDeleteWebhookEndpoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWebhookEndpoint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({ title: "Webhook endpoint deleted", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete webhook endpoint",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useWebhookDeliveries = (id: string, query: WebhookDeliveryListQuery) => {
  return useQuery({
    queryKey: ["webhooks", id, "deliveries", query],
    queryFn: () => getWebhookDeliveries(id, query),
    enabled: !!id,
  });
};

export const useSendTestWebhookEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, eventType }: { id: string; eventType: WebhookEventType }) =>
      sendTestWebhookEvent(id, eventType),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", id, "deliveries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not send test event",
        description: error.message,
        variant: "error",
      });
    },
  });
};
