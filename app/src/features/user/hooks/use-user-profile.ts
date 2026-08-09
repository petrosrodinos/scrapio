import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  getCrawlScheduleTimezones,
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../services/user-profile.services";
import type { UpdateUserProfilePayload } from "../interfaces/user-profile.interfaces";

export const useCurrentUserProfile = () => {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: getCurrentUserProfile,
  });
};

export const useCrawlScheduleTimezones = () => {
  return useQuery({
    queryKey: ["users", "crawl-schedule-timezones"],
    queryFn: getCrawlScheduleTimezones,
  });
};

export const useUpdateCurrentUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserProfilePayload) => updateCurrentUserProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Profile updated", duration: 2000, variant: "success" });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not update profile",
        description: error.message,
        variant: "error",
      });
    },
  });
};
