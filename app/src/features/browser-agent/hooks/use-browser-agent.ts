import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  bulkDeleteBrowserAgentConfigs,
  createBrowserAgentConfig,
  deleteBrowserAgentConfig,
  getBrowserAgentConfig,
  getBrowserAgentConfigs,
  runBrowserAgentConfigNow,
  updateBrowserAgentConfig,
} from "../services/browser-agent.services";
import type {
  BrowserAgentConfigListQuery,
  CreateBrowserAgentConfigPayload,
  UpdateBrowserAgentConfigPayload,
} from "../interfaces/browser-agent.interfaces";

export const useBrowserAgentConfigs = (
  query: BrowserAgentConfigListQuery,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["browser-agent-configs", "list", query],
    queryFn: () => getBrowserAgentConfigs(query),
    enabled: options?.enabled ?? true,
  });
};

export const useBrowserAgentConfig = (id: string) => {
  return useQuery({
    queryKey: ["browser-agent-configs", "detail", id],
    queryFn: () => getBrowserAgentConfig(id),
    enabled: !!id,
  });
};

export const useCreateBrowserAgentConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBrowserAgentConfigPayload) => createBrowserAgentConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-agent-configs"] });
      toast({ title: "Browser agent config created", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create browser agent config",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useUpdateBrowserAgentConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBrowserAgentConfigPayload }) =>
      updateBrowserAgentConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-agent-configs"] });
      toast({ title: "Browser agent config updated", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update browser agent config",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useDeleteBrowserAgentConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBrowserAgentConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-agent-configs"] });
      toast({ title: "Browser agent config deleted", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete browser agent config",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useBulkDeleteBrowserAgentConfigs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteBrowserAgentConfigs(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-agent-configs"] });
      toast({ title: "Browser agent configs deleted", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete browser agent configs",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useRunBrowserAgentConfigNow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => runBrowserAgentConfigNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawlRuns"] });
      toast({ title: "Browser agent run started", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start browser agent run",
        description: error.message,
        variant: "error",
      });
    },
  });
};
