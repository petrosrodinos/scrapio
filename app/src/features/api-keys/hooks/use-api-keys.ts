import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  createApiKey,
  getApiKeys,
  renameApiKey,
  revokeApiKey,
} from "../services/api-keys.services";
import type { CreateApiKeyPayload, UpdateApiKeyPayload } from "../interfaces/api-keys.interfaces";

export const useApiKeys = () => {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: getApiKeys,
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateApiKeyPayload) => createApiKey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create API key",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useRenameApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateApiKeyPayload }) =>
      renameApiKey(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API key renamed", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not rename API key",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API key revoked", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not revoke API key",
        description: error.message,
        variant: "error",
      });
    },
  });
};
