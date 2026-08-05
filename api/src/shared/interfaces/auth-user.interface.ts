import { AuthRole } from 'generated/prisma';

export interface AuthUser {
  id: string;
  role: AuthRole;
}
