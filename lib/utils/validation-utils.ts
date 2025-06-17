import mongoose from "mongoose"

/**
 * Validation utilities to reduce code duplication
 */

/**
 * Validates if a string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  if (!id || typeof id !== "string") return false
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * Validates multiple ObjectIds at once
 */
export function areValidObjectIds(...ids: (string | undefined | null)[]): boolean {
  return ids.every(id => id ? isValidObjectId(id) : true) // undefined/null are allowed
}

/**
 * Validates required ObjectIds (cannot be undefined/null)
 */
export function areValidRequiredObjectIds(...ids: (string | undefined | null)[]): boolean {
  return ids.every(id => id && isValidObjectId(id))
}

/**
 * Validates date string
 */
export function isValidDate(dateString: string | undefined | null): boolean {
  if (!dateString || typeof dateString !== "string") return false
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Validates that date1 is before date2
 */
export function isDateBefore(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1
  const d2 = typeof date2 === "string" ? new Date(date2) : date2
  return d1 < d2
}

/**
 * Validates positive number
 */
export function isPositiveNumber(value: any): boolean {
  const num = Number(value)
  return !isNaN(num) && num > 0
}

/**
 * Validates minimum value
 */
export function isMinimumValue(value: any, min: number): boolean {
  const num = Number(value)
  return !isNaN(num) && num >= min
}

/**
 * Validates email format (basic)
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== "string") return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates phone format (basic Israeli format)
 */
export function isValidPhone(phone: string | undefined | null): boolean {
  if (!phone || typeof phone !== "string") return false
  // Basic validation for Israeli phone numbers
  const phoneRegex = /^(\+972|0)?[5-9]\d{8}$/
  return phoneRegex.test(phone.replace(/[-\s]/g, ""))
}

/**
 * Common validation result interface
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates required string field
 */
export function validateRequiredString(value: any, fieldName: string, minLength: number = 1): ValidationResult {
  if (!value || typeof value !== "string" || value.trim().length < minLength) {
    return {
      valid: false,
      error: `${fieldName} is required${minLength > 1 ? ` and must be at least ${minLength} characters` : ""}.`
    }
  }
  return { valid: true }
}

/**
 * Validates ObjectId field
 */
export function validateObjectId(value: any, fieldName: string, required: boolean = true): ValidationResult {
  if (!value) {
    if (required) {
      return { valid: false, error: `${fieldName} is required.` }
    }
    return { valid: true }
  }
  
  if (!isValidObjectId(value)) {
    return { valid: false, error: `Invalid ${fieldName} format.` }
  }
  
  return { valid: true }
}

/**
 * Validates date field
 */
export function validateDate(value: any, fieldName: string, required: boolean = true): ValidationResult {
  if (!value) {
    if (required) {
      return { valid: false, error: `${fieldName} is required.` }
    }
    return { valid: true }
  }
  
  if (!isValidDate(value)) {
    return { valid: false, error: `Invalid ${fieldName} format.` }
  }
  
  return { valid: true }
}

/**
 * Validates date range (from < until)
 */
export function validateDateRange(fromDate: any, untilDate: any, fromFieldName: string = "from date", untilFieldName: string = "until date"): ValidationResult {
  const fromValidation = validateDate(fromDate, fromFieldName)
  if (!fromValidation.valid) return fromValidation
  
  const untilValidation = validateDate(untilDate, untilFieldName)
  if (!untilValidation.valid) return untilValidation
  
  if (!isDateBefore(fromDate, untilDate)) {
    return {
      valid: false,
      error: `${fromFieldName} must be before ${untilFieldName}.`
    }
  }
  
  return { valid: true }
} 