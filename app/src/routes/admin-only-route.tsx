import { Outlet } from "react-router-dom";
import ProtectedRoute from "@/routes/protected-route";
import { RoleTypes } from "@/features/user/interfaces/user.interface";

const ADMIN_ROLES = [RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN, RoleTypes.SUPPORT] as const;

export default function AdminOnlyRoute() {
  return (
    <ProtectedRoute loggedIn requiredRoles={[...ADMIN_ROLES]}>
      <Outlet />
    </ProtectedRoute>
  );
}
