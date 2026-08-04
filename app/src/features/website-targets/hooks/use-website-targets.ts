import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  createWebsiteTarget,
  deleteWebsiteTarget,
  getWebsiteTarget,
  getWebsiteTargets,
  updateWebsiteTarget,
} from "../services/website-targets.services";
import type {
  CreateWebsiteTargetPayload,
  UpdateWebsiteTargetPayload,
  WebsiteTargetListQuery,
} from "../interfaces/website-targets.interfaces";

export const useWebsiteTargets = (
  query: WebsiteTargetListQuery,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["website-targets", "list", query],
    queryFn: () => getWebsiteTargets(query),
    enabled: options?.enabled ?? true,
  });
};

export const useWebsiteTarget = (id: string) => {
  return useQuery({
    queryKey: ["website-targets", "detail", id],
    queryFn: () => getWebsiteTarget(id),
    enabled: !!id,
  });
};

export const useCreateWebsiteTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWebsiteTargetPayload) => createWebsiteTarget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-targets"] });
      toast({ title: "Website target created", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create website target",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useUpdateWebsiteTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWebsiteTargetPayload }) =>
      updateWebsiteTarget(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-targets"] });
      toast({ title: "Website target updated", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update website target",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useDeleteWebsiteTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWebsiteTarget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-targets"] });
      toast({ title: "Website target deleted", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete website target",
        description: error.message,
        variant: "error",
      });
    },
  });
};
