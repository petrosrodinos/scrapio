import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  connectUserIntegration,
  disconnectUserIntegration,
  getUserIntegrations,
  updateUserIntegration,
} from "../services/user-integrations.services";
import type {
  ConnectUserIntegrationPayload,
  UpdateUserIntegrationPayload,
  UserIntegrationListQuery,
} from "../interfaces/user-integrations.interfaces";

export const useUserIntegrations = (query?: UserIntegrationListQuery) => {
  return useQuery({
    queryKey: ["user-integrations", query],
    queryFn: () => getUserIntegrations(query),
  });
};

export const useConnectUserIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConnectUserIntegrationPayload) => connectUserIntegration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
      toast({ title: "Integration connected", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not connect integration",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useUpdateUserIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserIntegrationPayload }) =>
      updateUserIntegration(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
      toast({ title: "Integration updated", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update integration",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useDisconnectUserIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disconnectUserIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
      toast({ title: "Integration disconnected", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not disconnect integration",
        description: error.message,
        variant: "error",
      });
    },
  });
};
