import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import type { Session } from "next-auth"

/**
 * Authentication utilities to reduce code duplication
 */

export interface AuthResult {
  success: boolean
  session?: Session
  error?: string
}

/**
 * Get authenticated session - returns session or error
 */
export async function getAuthenticatedSession(): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }
    return { success: true, session }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Authentication failed" 
    }
  }
}

/**
 * Require admin role - returns session or error
 */
export async function requireAdminSession(): Promise<AuthResult> {
  const authResult = await getAuthenticatedSession()
  if (!authResult.success || !authResult.session) {
    return authResult
  }

  if (!authResult.session.user.roles?.includes("admin")) {
    return { success: false, error: "Admin access required" }
  }

  return authResult
}

/**
 * Require specific role - returns session or error
 */
export async function requireRole(role: string): Promise<AuthResult> {
  const authResult = await getAuthenticatedSession()
  if (!authResult.success || !authResult.session) {
    return authResult
  }

  if (!authResult.session.user.roles?.includes(role)) {
    return { success: false, error: `${role} role required` }
  }

  return authResult
}

/**
 * Require one of multiple roles - returns session or error
 */
export async function requireAnyRole(...roles: string[]): Promise<AuthResult> {
  const authResult = await getAuthenticatedSession()
  if (!authResult.success || !authResult.session) {
    return authResult
  }

  const userRoles = authResult.session.user.roles || []
  const hasAnyRole = roles.some(role => userRoles.includes(role))
  
  if (!hasAnyRole) {
    return { success: false, error: `One of the following roles required: ${roles.join(", ")}` }
  }

  return authResult
}

/**
 * Check if user owns resource (user ID matches session user ID)
 */
export function isResourceOwner(session: Session, resourceUserId: string): boolean {
  return session.user.id === resourceUserId
}

/**
 * Check if user can access resource (owns it or is admin)
 */
export function canAccessResource(session: Session, resourceUserId: string): boolean {
  return isResourceOwner(session, resourceUserId) || session.user.roles?.includes("admin") || false
}

/**
 * Require resource ownership or admin - returns authorization result
 */
export async function requireResourceAccess(resourceUserId: string): Promise<AuthResult> {
  const authResult = await getAuthenticatedSession()
  if (!authResult.success || !authResult.session) {
    return authResult
  }

  if (!canAccessResource(authResult.session, resourceUserId)) {
    return { success: false, error: "Access denied - resource ownership or admin role required" }
  }

  return authResult
}

/**
 * Standard action response format
 */
export interface ActionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  issues?: any[]
}

/**
 * Create error response from auth result
 */
export function createAuthErrorResponse(authResult: AuthResult): ActionResponse {
  return {
    success: false,
    error: authResult.error || "Authentication failed"
  }
} 