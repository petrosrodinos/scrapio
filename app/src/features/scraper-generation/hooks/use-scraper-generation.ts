import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  approveGenerationRun,
  cancelGenerationRun,
  createGenerationRun,
  deleteGenerationRun,
  getGenerationRun,
  getGenerationRuns,
  rejectGenerationRun,
  retryGenerationRun,
  startGenerationRun,
  updateGenerationRun,
} from "../services/scraper-generation.services";
import type {
  CreateGenerationRunPayload,
  GenerationRun,
  GenerationRunListQuery,
  RejectGenerationRunPayload,
  RetryGenerationRunPayload,
  UpdateGenerationRunPayload,
} from "../interfaces/scraper-generation.interfaces";

const ACTIVE_STATUSES: GenerationRun["status"][] = ["QUEUED", "RUNNING"];

export const useGenerationRuns = (query: GenerationRunListQuery) => {
  return useQuery({
    queryKey: ["generationRuns", "list", query],
    queryFn: () => getGenerationRuns(query),
  });
};

export const useGenerationRun = (id: string) => {
  return useQuery({
    queryKey: ["generationRuns", "detail", id],
    queryFn: () => getGenerationRun(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 2000 : false;
    },
  });
};

export const useCreateGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGenerationRunPayload) => createGenerationRun(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      toast({
        title: payload.start ? "Generation run started" : "Generation run saved",
        duration: 2000,
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Could not create generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useUpdateGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGenerationRunPayload }) =>
      updateGenerationRun(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      queryClient.invalidateQueries({ queryKey: ["generationRuns", "detail", id] });
      toast({ title: "Generation run updated", duration: 2000, variant: "success" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not update generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useStartGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startGenerationRun(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      queryClient.invalidateQueries({ queryKey: ["generationRuns", "detail", id] });
      toast({ title: "Generation run started", duration: 2000, variant: "success" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not start generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useApproveGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveGenerationRun(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      queryClient.invalidateQueries({ queryKey: ["generationRuns", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["scrapers"] });
      toast({ title: "Generation run approved", duration: 2000, variant: "success" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not approve generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useRejectGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: RejectGenerationRunPayload }) =>
      rejectGenerationRun(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      queryClient.invalidateQueries({ queryKey: ["generationRuns", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["scrapers"] });
      toast({ title: "Generation run rejected", duration: 2000, variant: "success" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not reject generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useCancelGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelGenerationRun(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      queryClient.invalidateQueries({ queryKey: ["generationRuns", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["scrapers"] });
      toast({ title: "Generation run cancelled", duration: 2000, variant: "success" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not cancel generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useRetryGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: RetryGenerationRunPayload }) =>
      retryGenerationRun(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      queryClient.invalidateQueries({ queryKey: ["generationRuns", "detail", id] });
      toast({ title: "Generation run retry queued", duration: 2000, variant: "success" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not retry generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useDeleteGenerationRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGenerationRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generationRuns"] });
      queryClient.invalidateQueries({ queryKey: ["scrapers"] });
      toast({ title: "Generation run deleted", duration: 2000, variant: "success" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not delete generation run",
        description: error.message,
        variant: "error",
      });
    },
  });
};
