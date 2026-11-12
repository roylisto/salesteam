import "server-only";
import { isAdmin, type CurrentUser } from "@/lib/auth";

export function salesStockOwner(user: CurrentUser) {
  return user.userType === "sales" && !isAdmin(user) ? user.id : undefined;
}
