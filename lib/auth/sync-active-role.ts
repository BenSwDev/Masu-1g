import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"

/**
 * Syncs the active role between database and session
 * Returns the correct active role to use
 */
export async function syncActiveRole(): Promise<string> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    throw new Error("No authenticated user")
  }
  
  await dbConnect()
  const user = await User.findById(session.user.id).select('activeRole roles')
  
  if (!user) {
    throw new Error("User not found")
  }
  
  const roles = user.roles || []
  let activeRole = user.activeRole
  
  // Ensure activeRole is valid
  if (!activeRole || !roles.includes(activeRole)) {
    // Set a default active role based on priority
    if (roles.includes("admin")) {
      activeRole = "admin"
    } else if (roles.includes("professional")) {
      activeRole = "professional"
    } else if (roles.includes("partner")) {
      activeRole = "partner"
    } else {
      activeRole = "member"
    }
    
    // Update the user's active role in the database
    user.activeRole = activeRole
    await user.save()
  }
  
  return activeRole
}

/**
 * Gets the priority order for a given role
 */
export function getRolePriority(role: string): number {
  const priorities: Record<string, number> = {
    admin: 4,
    professional: 3,
    partner: 2,
    member: 1,
  }
  return priorities[role] || 0
}

/**
 * Gets the highest priority role from a list of roles
 */
export function getHighestPriorityRole(roles: string[]): string {
  if (!roles || roles.length === 0) return "member"
  
  return roles.reduce((highest, current) => {
    return getRolePriority(current) > getRolePriority(highest) ? current : highest
  }, roles[0])
}