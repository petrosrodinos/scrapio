import { useQuery } from "@tanstack/react-query";
import { getCostEntries, getCostSummary } from "../services/costs.services";
import type { CostQuery } from "../interfaces/costs.interfaces";

export const useCostSummary = (query?: CostQuery) => {
  return useQuery({
    queryKey: ["costs", "summary", query],
    queryFn: () => getCostSummary(query),
  });
};

export const useCostEntries = (query: CostQuery) => {
  return useQuery({
    queryKey: ["costs", "list", query],
    queryFn: () => getCostEntries(query),
  });
};
