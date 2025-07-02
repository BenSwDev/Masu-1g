"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import dbConnect from "../db/mongoose"
import { logger } from "../logs/logger"
import { revalidatePath } from "next/cache"

/**
 * Standard interfaces for admin actions
 */
export interface AdminActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: any
}

export interface PaginatedResult<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AdminActionOptions {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

/**
 * Admin session interface
 */
export interface AdminSession {
  user: {
    id: string
    email: string
    roles: string[]
    name: string
    phone?: string
    activeRole?: string
  }
}

/**
 * Unified admin authentication
 * Ensures user is authenticated and has admin role
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new Error("אימות נדרש - אנא התחבר למערכת")
  }
  
  // Type assertion for our extended user properties
  const user = session.user as any
  
  if (!user.id) {
    throw new Error("אימות נדרש - אנא התחבר למערכת")
  }
  
  if (!user.roles?.includes("admin")) {
    throw new Error("אין לך הרשאות מנהל לביצוע פעולה זו")
  }
  
  return {
    user: {
      id: user.id,
      email: user.email || "",
      roles: user.roles || [],
      name: user.name || "",
      phone: user.phone,
      activeRole: user.activeRole
    }
  }
}

/**
 * Unified database connection
 * Ensures database is connected before operations
 */
export async function connectToDatabase(): Promise<void> {
  try {
    await dbConnect()
  } catch (error) {
    logger.error("Failed to connect to database:", error)
    throw new Error("שגיאה בחיבור לבסיס הנתונים")
  }
}

/**
 * Unified admin logger with request context
 */
export class AdminLogger {
  private requestId: string
  private action: string

  constructor(action: string) {
    this.action = action
    this.requestId = Math.random().toString(36).substring(2, 15)
  }

  info(message: string, data?: any): void {
    logger.info(`[ADMIN:${this.action}:${this.requestId}] ${message}`, data)
  }

  error(message: string, error?: any): void {
    logger.error(`[ADMIN:${this.action}:${this.requestId}] ${message}`, error)
  }

  warn(message: string, data?: any): void {
    logger.warn(`[ADMIN:${this.action}:${this.requestId}] ${message}`, data)
  }
}

/**
 * Unified error handler for admin actions
 */
export function handleAdminError(error: any, action: string): AdminActionResult {
  const adminLogger = new AdminLogger(action)
  
  if (error instanceof Error) {
    // Known error types
    if (error.message.includes("אימות נדרש") || error.message.includes("אין לך הרשאות")) {
      adminLogger.warn("Unauthorized access attempt", { message: error.message })
      return { success: false, error: error.message }
    }
    
    if (error.message.includes("בסיס הנתונים")) {
      adminLogger.error("Database connection error", error)
      return { success: false, error: "שגיאה בחיבור לבסיס הנתונים" }
    }
    
    // Generic error
    adminLogger.error("Action failed", error)
    return { success: false, error: error.message }
  }
  
  // Unknown error
  adminLogger.error("Unknown error occurred", error)
  return { success: false, error: "שגיאה לא צפויה אירעה" }
}

/**
 * Unified pagination helper
 */
export function validatePaginationOptions(options: AdminActionOptions): {
  page: number
  limit: number
  skip: number
} {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 10))
  const skip = (page - 1) * limit
  
  return { page, limit, skip }
}

/**
 * Unified revalidation helper
 */
export function revalidateAdminPath(path: string): void {
  try {
    revalidatePath(path)
  } catch (error) {
    logger.warn("Failed to revalidate path", { path, error })
  }
}

/**
 * Unified success result helper
 */
export function createSuccessResult<T>(data?: T): AdminActionResult<T> {
  return { success: true, data }
}

/**
 * Unified error result helper
 */
export function createErrorResult(error: string, details?: any): AdminActionResult {
  return { success: false, error, details }
}

/**
 * Unified paginated result helper
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): AdminActionResult<PaginatedResult<T>> {
  return {
    success: true,
    data: {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
}

/**
 * Unified MongoDB object serialization
 * Handles ObjectId and Date serialization for JSON responses
 */
export function serializeMongoObject<T>(obj: any): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Unified validation helper for MongoDB ObjectIds
 */
export function validateObjectId(id: string, fieldName: string = "ID"): void {
  if (!id || typeof id !== "string") {
    throw new Error(`${fieldName} נדרש`)
  }
  
  // Basic ObjectId validation (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new Error(`${fieldName} לא תקין`)
  }
}

/**
 * Unified search query builder
 */
export function buildSearchQuery(
  search: string,
  searchFields: string[]
): Record<string, any> {
  if (!search?.trim()) {
    return {}
  }
  
  const searchRegex = { $regex: search.trim(), $options: "i" }
  return {
    $or: searchFields.map(field => ({ [field]: searchRegex }))
  }
}

/**
 * Unified sort query builder
 */
export function buildSortQuery(
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc"
): Record<string, 1 | -1> {
  return { [sortBy]: sortOrder === "asc" ? 1 : -1 }
} 