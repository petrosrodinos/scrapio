import { useQuery } from "@tanstack/react-query";
import { getIntegration, getIntegrations } from "../services/integrations.services";
import type { IntegrationType } from "../interfaces/integrations.interfaces";

export const useIntegrations = () => {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: getIntegrations,
  });
};

export const useIntegration = (type: IntegrationType) => {
  return useQuery({
    queryKey: ["integrations", type],
    queryFn: () => getIntegration(type),
    enabled: !!type,
  });
};
