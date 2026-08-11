import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  bulkDeletePlainScrapeConfigs,
  createPlainScrapeConfig,
  deletePlainScrapeConfig,
  getPlainScrapeConfig,
  getPlainScrapeConfigs,
  runPlainScrapeConfigNow,
  updatePlainScrapeConfig,
} from "../services/plain-scrape.services";
import type {
  CreatePlainScrapeConfigPayload,
  PlainScrapeConfigListQuery,
  UpdatePlainScrapeConfigPayload,
} from "../interfaces/plain-scrape.interfaces";

export const usePlainScrapeConfigs = (
  query: PlainScrapeConfigListQuery,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["plain-scrape-configs", "list", query],
    queryFn: () => getPlainScrapeConfigs(query),
    enabled: options?.enabled ?? true,
  });
};

export const usePlainScrapeConfig = (id: string) => {
  return useQuery({
    queryKey: ["plain-scrape-configs", "detail", id],
    queryFn: () => getPlainScrapeConfig(id),
    enabled: !!id,
  });
};

export const useCreatePlainScrapeConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlainScrapeConfigPayload) => createPlainScrapeConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plain-scrape-configs"] });
      toast({ title: "Plain scrape config created", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create plain scrape config",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useUpdatePlainScrapeConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlainScrapeConfigPayload }) =>
      updatePlainScrapeConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plain-scrape-configs"] });
      toast({ title: "Plain scrape config updated", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update plain scrape config",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useDeletePlainScrapeConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePlainScrapeConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plain-scrape-configs"] });
      toast({ title: "Plain scrape config deleted", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete plain scrape config",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useBulkDeletePlainScrapeConfigs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeletePlainScrapeConfigs(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plain-scrape-configs"] });
      toast({ title: "Plain scrape configs deleted", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete plain scrape configs",
        description: error.message,
        variant: "error",
      });
    },
  });
};

export const useRunPlainScrapeConfigNow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => runPlainScrapeConfigNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawlRuns"] });
      toast({ title: "Plain scrape run started", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start plain scrape run",
        description: error.message,
        variant: "error",
      });
    },
  });
};
