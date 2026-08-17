import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../services/users.services";

export const useUsers = (enabled = true) => {
  return useQuery({
    queryKey: ["users", "list"],
    queryFn: () => getUsers(),
    enabled,
  });
};
