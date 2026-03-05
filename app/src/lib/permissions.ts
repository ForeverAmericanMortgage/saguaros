import { cookies } from "next/headers";
import { env } from "@/lib/env";

export type Role = "admin" | "board" | "member" | "viewer";

const rolePriority: Record<Role, number> = {
  viewer: 0,
  member: 1,
  board: 2,
  admin: 3,
};

export async function getCurrentRole(): Promise<Role> {
  if (process.env.NODE_ENV !== "production") {
    return "admin";
  }

  if (env.dangerouslySkipPermissions) {
    return "admin";
  }

  const cookieStore = await cookies();
  const value = cookieStore.get("saguaros_role")?.value;

  if (value === "admin" || value === "board" || value === "member" || value === "viewer") {
    return value;
  }

  return "viewer";
}

export async function requireRole(minimumRole: Role) {
  const role = await getCurrentRole();

  if (rolePriority[role] < rolePriority[minimumRole]) {
    throw new Error(`Insufficient permissions. Required: ${minimumRole}`);
  }

  return role;
}
