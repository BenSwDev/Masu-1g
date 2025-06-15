import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { logger } from "@/lib/logs/logger";
import { redirect } from "next/navigation";

export async function requireUserSession() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return null;
    }
    return session;
  } catch (error) {
    logger.error("Error fetching user session", { error });
    return null;
  }
}
