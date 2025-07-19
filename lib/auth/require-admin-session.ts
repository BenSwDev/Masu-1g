import { redirect } from "next/navigation";
import { requireUserSession } from "./require-session";
import { UserRole } from "@/lib/db/models/user";

export async function requireAdminSession() {
  try {
    const session = await requireUserSession();
    if (!session.user.roles.includes(UserRole.ADMIN)) {
      redirect("/dashboard");
    }
    return session;
  } catch (error) {
    console.error("Error fetching admin session", error);
    redirect("/auth/login");
  }
}
